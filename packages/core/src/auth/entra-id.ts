import { ConfidentialClientApplication } from "@azure/msal-node";
import { Oauth2Provider } from "@openauthjs/openauth/provider/oauth2";
import * as R from "remeda";
import { Resource } from "sst";

import { withActor } from "../actors/context";
import { useTransaction } from "../drizzle/context";
import { SharedErrors } from "../errors/shared";
import { Graph } from "../graph";
import { Tenants } from "../tenants";
import { Users } from "../users";
import { Constants } from "../utils/constants";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";
import type { UserSubjectProperties } from "./shared";

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

  export async function handleUser(
    identityProviderId: string,
  ): Promise<UserSubjectProperties> {
    const { id, userPrincipalName, preferredName, mail } = await Graph.me();
    if (!id || !userPrincipalName || !preferredName || !mail)
      throw new Error("missing user info");

    const tenant = await Tenants.byIdentityProvider(
      Constants.ENTRA_ID,
      identityProviderId,
    );
    if (!tenant) throw new Error("tenant not found");

    return withActor(
      () => ({
        kind: Constants.ACTOR_KINDS.SYSTEM,
        properties: { tenantId: tenant.id },
      }),
      async () =>
        useTransaction(async () => {
          let user = await Users.byIdentityProvider(
            id,
            identityProviderId,
          ).then(R.first());

          switch (tenant.status) {
            case "setup": {
              if (!user) {
                user = await Users.put([
                  {
                    origin: "internal",
                    username: userPrincipalName,
                    subjectId: id,
                    identityProviderId,
                    role: "administrator",
                    name: preferredName,
                    email: mail,
                    tenantId: tenant.id,
                  },
                ]).then(R.first());
                if (!user) throw new Error("failed to create admin user");

                return {
                  id: user.id,
                  tenantId: tenant.id,
                };
              }

              if (
                user.username !== userPrincipalName ||
                user.name !== preferredName ||
                user.email !== mail
              )
                await Users.updateOne({
                  id: user.id,
                  username: userPrincipalName,
                  name: preferredName,
                  email: mail,
                });

              return {
                id: user.id,
                tenantId: tenant.id,
              };
            }
            case "active": {
              if (!user) throw new Error("user not found");

              if (
                user.username !== userPrincipalName ||
                user.name !== preferredName ||
                user.email !== mail
              )
                await Users.updateOne({
                  id: user.id,
                  username: userPrincipalName,
                  name: preferredName,
                  email: mail,
                });

              return {
                id: user.id,
                tenantId: tenant.id,
              };
            }
            case "suspended":
              throw new Error("tenant suspended");
            default:
              throw new SharedErrors.NonExhaustiveValue(tenant.status);
          }
        }),
    );
  }

  export async function applicationAccessToken(providerId: string) {
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: Resource.IdentityProviders[Constants.ENTRA_ID].clientId,
        clientSecret:
          Resource.IdentityProviders[Constants.ENTRA_ID].clientSecret,
        authority: `https://login.microsoftonline.com/${providerId}`,
      },
    });

    const result = await cca.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
    if (!result) throw new Error("Failed to acquire application access token");

    return result.accessToken;
  }
}
