import { Constants } from "@printdesk/core/utils/constants";

import { auth } from "./auth";
import { fqdn } from "./dns";
import { appData, isProdStage, replicacheLicenseKey } from "./misc";
import { router } from "./router";
import { injectLinkables } from "./utils";

export const web = new sst.aws.StaticSite("Web", {
  path: "packages/web",
  build: {
    command: "pnpm build",
    output: "dist",
  },
  router: {
    instance: router,
    domain: isProdStage ? $interpolate`*.${fqdn}` : undefined,
  },
  environment: injectLinkables(
    {
      AppData: appData,
      Auth: auth,
      ReplicacheLicenseKey: replicacheLicenseKey,
      Router: router,
    },
    Constants.VITE_RESOURCE_PREFIX,
  ),
});

export const outputs = {
  web: web.url,
};
