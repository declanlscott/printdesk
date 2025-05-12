import { Constants } from "@printdesk/core/utils/constants";

import { issuer } from "./auth";
import { router } from "./cdn";
import { domains } from "./dns";
import { appData, isProdStage, replicacheLicenseKey } from "./misc";
import { injectLinkables } from "./utils";

export const web = new sst.aws.StaticSite("Web", {
  path: "packages/web",
  build: {
    command: "pnpm build",
    output: "dist",
  },
  router: {
    instance: router,
    domain: isProdStage ? $interpolate`*.${domains.properties.web}` : undefined,
  },
  environment: injectLinkables(
    Constants.VITE_RESOURCE_PREFIX,
    appData,
    issuer,
    replicacheLicenseKey,
    router,
  ),
});

export const outputs = {
  web: web.url,
};
