import { Constants } from "@printworks/core/utils/constants";

export const tenantParameters = {
  documentsMimeTypes: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/app/settings/documents/mime-types`,
  },
  documentsSizeLimit: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/app/settings/documents/size-limit`,
  },
  tailnetPapercutServerUri: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/papercut/server/tailnet-uri`,
  },
  papercutServerAuthToken: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/papercut/server/auth-token`,
  },
  tailscaleOauthClient: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/tailscale/oauth-client`,
  },
} as const;
