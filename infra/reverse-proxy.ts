import { Constants } from "@printdesk/core/utils/constants";

import { auth } from "./auth";
import * as custom from "./custom";
import { fqdn, zone } from "./dns";
import { router } from "./router";

export const reverseProxyWorker = new sst.cloudflare.Worker(
  "ReverseProxyWorker",
  {
    handler: "packages/workers/src/reverse-proxy/index.ts",
    link: [auth, router],
    url: false,
  },
);

export const reverseProxyWorkerSettings =
  new custom.cloudflare.Workers.Settings("ReverseProxyWorkerSettings", {
    scriptName: reverseProxyWorker.nodes.worker.name,
    bindings: [
      {
        name: Constants.CLOUDFLARE_BINDING_NAMES.RATE_LIMITER,
        type: "ratelimit",
        namespace_id: "1001",
        simple: {
          limit: 100,
          period: 60,
        },
      },
    ],
  });

export const reverseProxyApiRoute = new cloudflare.WorkersRoute(
  "ReverseProxyApiRoute",
  {
    zoneId: zone.id,
    pattern: $interpolate`${fqdn}/api/*`,
    scriptName: reverseProxyWorker.nodes.worker.name,
  },
);

export const reverseProxyAuthRoute = new cloudflare.WorkersRoute(
  "ReverseProxyAuthRoute",
  {
    zoneId: zone.id,
    pattern: $interpolate`${fqdn}/auth/*`,
    scriptName: reverseProxyWorker.nodes.worker.name,
  },
);
