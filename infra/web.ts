import { api } from "infra/api";
import { fqdn } from "infra/dns";

import { auth } from "./auth";
import { appData, replicacheLicenseKey } from "./misc";
import { injectLinkables } from "./utils";
import { www } from "./www";

export const webUsername = new sst.Secret("WebUsername");
export const webPassword = new sst.Secret("WebPassword");

const basicAuth = $output([webUsername.value, webPassword.value]).apply(
  ([username, password]) =>
    Buffer.from(`${username}:${password}`).toString("base64"),
);

export const web = new sst.aws.StaticSite("Web", {
  path: "packages/web",
  build: {
    command: "pnpm build",
    output: "dist",
  },
  domain: {
    name: $interpolate`*.${fqdn}`,
    dns: sst.cloudflare.dns(),
  },
  edge:
    $app.stage !== "production"
      ? {
          viewerRequest: {
            injection: $interpolate`
if (
  !event.request.headers.authorization ||
  event.request.headers.authorization.value !== "Basic ${basicAuth}"
) {
  return {
    statusCode: 401,
    headers: {
      "www-authenticate": { value: "Basic" }
    }
  };
}`,
          },
        }
      : undefined,
  environment: injectLinkables(
    {
      AppData: appData.getSSTLink().properties,
      Api: api.getSSTLink().properties,
      Auth: auth.getSSTLink().properties,
      ReplicacheLicenseKey: replicacheLicenseKey.getSSTLink().properties,
      Www: www.getSSTLink().properties,
    },
    "VITE_RESOURCE_",
  ),
});

export const outputs = {
  web: web.url,
};
