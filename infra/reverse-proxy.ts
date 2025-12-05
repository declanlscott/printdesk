import { Constants } from "@printdesk/core/utils/constants";

import { issuer } from "./auth";
import { domains, zone } from "./dns";
import * as lib from "./lib/components";

export const reverseProxyWorker = new sst.cloudflare.Worker(
  "ReverseProxyWorker",
  {
    handler: "packages/workers/src/reverse-proxy/index.ts",
    link: [issuer],
    url: false,
  },
);

export const reverseProxyWorkerAuxiliaryBindings =
  new lib.cloudflare.workers.AuxiliaryBindings(
    "ReverseProxyWorkerAuxiliaryBindings",
    {
      scriptName: reverseProxyWorker.nodes.worker.scriptName,
      bindings: {
        [Constants.CLOUDFLARE_BINDING_NAMES.RATE_LIMITER]: {
          type: "ratelimit",
          namespace_id: "1001",
          simple: { limit: 100, period: 60 },
        },
      },
    },
  );

export const reverseProxyApiRoute = new cloudflare.WorkersRoute(
  "ReverseProxyApiRoute",
  {
    zoneId: zone.properties.id,
    pattern: $interpolate`${domains.properties.api}/*`,
    script: reverseProxyWorker.nodes.worker.scriptName,
  },
);

export const reverseProxyAuthRoute = new cloudflare.WorkersRoute(
  "ReverseProxyAuthRoute",
  {
    zoneId: zone.properties.id,
    pattern: $interpolate`${domains.properties.auth}/*`,
    script: reverseProxyWorker.nodes.worker.scriptName,
  },
);
