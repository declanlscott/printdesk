import { Constants } from "@printdesk/core/utils/constants";

import { api } from "./api";
import { auth, siteEdgeProtection } from "./auth";
import { fqdn } from "./dns";
import { appData, replicacheLicenseKey } from "./misc";
import { injectLinkables } from "./utils";
import { www } from "./www";

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
  edge: siteEdgeProtection,
  environment: injectLinkables(
    {
      AppData: appData,
      Api: api,
      Auth: auth,
      ReplicacheLicenseKey: replicacheLicenseKey,
      Www: www,
    },
    Constants.VITE_RESOURCE_PREFIX,
  ),
});

export const outputs = {
  web: web.url,
};
