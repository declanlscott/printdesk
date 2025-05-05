import { Constants } from "@printdesk/core/utils/constants";

import { auth } from "./auth";
import { fqdn, zone } from "./dns";
import { router } from "./router";

export const reverseProxyWorker = new sst.cloudflare.Worker(
  "ReverseProxyWorker",
  {
    handler: "packages/workers/src/reverse-proxy/index.ts",
    link: [auth, router],
    url: false,
    // NOTE: In the future when the cloudflare rate limiting api is generally available and
    // pulumi/sst supports the binding, we can remove this transform and bind directly to
    // the rate limiters instead of binding to another worker with the rate limiter bindings.
    transform: {
      worker: {
        serviceBindings: [
          {
            name: Constants.SERVICE_BINDING_NAMES.RATE_LIMITERS,
            service: "printdesk-rate-limiters",
          },
        ],
      },
    },
  },
);

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
