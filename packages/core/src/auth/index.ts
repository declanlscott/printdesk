import { ConfidentialClientApplication } from "@azure/msal-node";
import { Oauth2Provider } from "@openauthjs/openauth/provider/oauth2";
import { Resource } from "sst";

import { Constants } from "../utils/constants";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";

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
