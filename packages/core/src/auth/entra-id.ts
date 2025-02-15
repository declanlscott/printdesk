import { ConfidentialClientApplication } from "@azure/msal-node";
import {
  Oauth2Provider,
  Oauth2WrappedConfig,
} from "@openauthjs/openauth/provider/oauth2";
import { and, eq } from "drizzle-orm";
import { Resource } from "sst";
import * as v from "valibot";

import { useTransaction } from "../drizzle/context";
import { Users } from "../users";
import { userProfilesTable, usersTable } from "../users/sql";
import { Constants } from "../utils/constants";
import { Graph } from "../utils/graph";
import { fn } from "../utils/shared";

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

  export const handleUser = fn(
    v.looseObject({ aud: v.string(), tid: v.string() }),
    async ({ aud, tid }) => {
      if (aud !== Resource.Oauth2.entraId.clientId)
        throw new Error("invalid audience");

      const { id, userPrincipalName, preferredName, mail } = await Graph.me();
      if (!id || !userPrincipalName || !preferredName || !mail)
        throw new Error("missing graph user data");

      return useTransaction(async (tx) => {
        const user = await Users.fromOauth(
          userPrincipalName,
          tid,
          Constants.ENTRA_ID,
        );

        let shouldPoke = false;

        if (user.username !== userPrincipalName) {
          await tx
            .update(usersTable)
            .set({ username: userPrincipalName })
            .where(
              and(
                eq(usersTable.id, user.id),
                eq(usersTable.tenantId, user.tenantId),
              ),
            );

          shouldPoke = true;
        }

        if (!user.profile) {
          const profile = await Users.createProfile({
            userId: user.id,
            oauth2UserId: id,
            oauth2ProviderId: tid,
            name: preferredName,
            email: mail,
            tenantId: user.tenantId,
          });
          if (!profile) throw new Error("Failed creating user profile.");

          user.profile = profile;

          shouldPoke = true;
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
                eq(userProfilesTable.tenantId, user.tenantId),
              ),
            );

          shouldPoke = true;
        }

        return {
          shouldPoke,
          properties: {
            id: user.id,
            tenantId: user.tenantId,
          },
        };
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
