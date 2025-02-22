import { tenantIdPlaceholder } from "./utils";

export const tenantParameters = {
  documentsMimeTypes: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${tenantIdPlaceholder}/app/settings/documents/mime-types`,
  },
  documentsSizeLimit: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${tenantIdPlaceholder}/app/settings/documents/size-limit`,
  },
  tailnetPapercutServerUri: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${tenantIdPlaceholder}/papercut/server/tailnet-uri`,
  },
  papercutServerAuthToken: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${tenantIdPlaceholder}/papercut/server/auth-token`,
  },
  tailscaleOauthClient: {
    nameTemplate: `/${$app.name}/${$app.stage}/tenant/${tenantIdPlaceholder}/tailscale/oauth-client`,
  },
} as const;
