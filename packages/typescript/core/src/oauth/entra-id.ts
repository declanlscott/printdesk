import { Oauth2Provider, type Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";

import { Constants } from "../utils/constants";

export interface EntraIdProviderConfig extends Oauth2WrappedConfig {
  tenant: string;
}

export const EntraIdProvider = ({ tenant, ...config }: EntraIdProviderConfig) =>
  Oauth2Provider({
    ...config,
    type: Constants.ENTRA_ID,
    endpoint: {
      authorization: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    },
  });
