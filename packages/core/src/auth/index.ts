import { ConfidentialClientApplication } from "@azure/msal-node";
import { Oauth2Provider } from "@openauthjs/openauth/provider/oauth2";
import { and, eq, isNull } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { afterTransaction, useTransaction } from "../drizzle/context";
import { poke as _poke } from "../replicache/poke";
import { licensesTable, tenantsTable } from "../tenants/sql";
import { Users } from "../users";
import { userProfilesTable, usersTable } from "../users/sql";
import { Credentials, SignatureV4, withAws } from "../utils/aws";
import { Constants } from "../utils/constants";
import { Graph } from "../utils/graph";
import { fn } from "../utils/shared";
import { oauth2ProvidersTable } from "./sql";

import type { OnSuccessResponder } from "@openauthjs/openauth/issuer";
import type { Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";
import type { SubjectPayload } from "@openauthjs/openauth/subject";
import type { Tenant } from "../tenants/sql";
import type { User } from "../users/sql";
import type { Oauth2ProviderType } from "./shared";
import type { subjects } from "./subjects";

export namespace EntraId {
  export interface ProviderConfig extends Oauth2WrappedConfig {
    tenant: string;
  }

  export const provider = ({ tenant, ...config }: ProviderConfig) =>
    Oauth2Provider({
      ...config,
      type: Constants.ENTRA_ID,
      endpoint: {
        authorization: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      },
    });

  export const getSuccessHandler = (
    subject: OnSuccessResponder<SubjectPayload<typeof subjects>>["subject"],
  ) =>
    fn(
      v.looseObject({ aud: v.string(), tid: v.string() }),
      async ({ aud, tid }) => {
        if (aud !== Resource.Oauth2.entraId.clientId)
          throw new Error("invalid audience");

        const { id, userPrincipalName, preferredName, mail } = await Graph.me();
        if (!id || !userPrincipalName || !preferredName || !mail)
          throw new Error("missing graph user data");

        return useTransaction(async (tx) => {
          const user = await readUser(
            userPrincipalName,
            tid,
            Constants.ENTRA_ID,
          );
          const tenantId = user.tenantId;

          if (!user.profile) {
            await Users.createProfile({
              userId: user.id,
              oauth2UserId: id,
              oauth2ProviderId: tid,
              name: preferredName,
              email: mail,
              tenantId,
            });

            await afterTransaction(() => poke(tenantId, ["/tenant"]));

            return subject("user", {
              id: user.id,
              tenantId,
            });
          }

          let userHasChanged = false;

          if (user.username !== userPrincipalName) {
            await tx
              .update(usersTable)
              .set({ username: userPrincipalName })
              .where(
                and(
                  eq(usersTable.id, user.id),
                  eq(usersTable.tenantId, tenantId),
                ),
              );

            userHasChanged = true;
          }

          if (
            user.profile.name !== preferredName ||
            user.profile.email !== mail
          ) {
            await tx
              .update(userProfilesTable)
              .set({
                name: user.profile.name,
                email: mail,
              })
              .where(
                and(
                  eq(userProfilesTable.userId, user.id),
                  eq(userProfilesTable.tenantId, tenantId),
                ),
              );

            userHasChanged = true;
          }

          if (userHasChanged)
            await afterTransaction(() => poke(tenantId, ["/tenant"]));

          return subject("user", {
            id: user.id,
            tenantId,
          });
        });
      },
    );

  export async function applicationAccessToken(tenantId: string) {
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: Resource.Oauth2.entraId.clientId,
        clientSecret: Resource.Oauth2.entraId.clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });

    const result = await cca.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
    if (!result) throw new Error("Failed to acquire application access token");

    return result.accessToken;
  }
}

export namespace Google {
  // TODO
}

// Internal functions

const readUser = (
  username: User["username"],
  tenantId: Tenant["id"],
  providerType: Oauth2ProviderType,
) =>
  useTransaction(async (tx) => {
    const result = await tx
      .select({
        tenant: tenantsTable,
        user: usersTable,
        userProfile: userProfilesTable,
      })
      .from(tenantsTable)
      .innerJoin(
        oauth2ProvidersTable,
        and(
          eq(oauth2ProvidersTable.type, providerType),
          eq(oauth2ProvidersTable.tenantId, tenantsTable.id),
        ),
      )
      .innerJoin(licensesTable, eq(licensesTable.tenantId, tenantsTable.id))
      .leftJoin(usersTable, eq(usersTable.tenantId, tenantsTable.id))
      .leftJoin(userProfilesTable, eq(userProfilesTable.userId, usersTable.id))
      .where(
        and(
          eq(oauth2ProvidersTable.id, tenantId),
          eq(tenantsTable.status, "active"),
          eq(licensesTable.status, "active"),
          isNull(tenantsTable.deletedAt),
          eq(usersTable.username, username),
        ),
      )
      .then(R.first());
    if (!result) throw new Error("tenant not found or inactive");
    if (!result.user) throw new Error("user not found");
    if (result.user.deletedAt) throw new Error("user is deleted");

    return {
      ...result.user,
      profile: result.userProfile,
    };
  });

const poke = <TChannel extends string>(
  tenantId: Tenant["id"],
  ...args: Parameters<typeof _poke<TChannel>>
) =>
  withAws(
    {
      sigv4: {
        signers: {
          "execute-api": SignatureV4.buildSigner({
            region: Resource.Aws.region,
            service: "execute-api",
          }),
        },
      },
    },
    async () =>
      withAws(
        {
          sigv4: {
            signers: {
              appsync: SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "appsync",
                credentials: Credentials.fromRoleChain([
                  {
                    RoleArn: Credentials.buildRoleArn(
                      Resource.Aws.account.id,
                      Resource.Aws.tenant.roles.realtimePublisher.nameTemplate,
                      tenantId,
                    ),
                    RoleSessionName: "IssuerRealtimePublisher",
                  },
                ]),
              }),
            },
          },
        },
        () => _poke(...args),
      ),
  );
