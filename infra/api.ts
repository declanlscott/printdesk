import { Constants } from "@printdesk/core/utils/constants";

import { auth } from "./auth";
import { temporaryBucket } from "./buckets";
import * as custom from "./custom";
import { dsqlCluster, userActivityTable } from "./db";
import { fqdn, zone } from "./dns";
import { appData, aws_, cloudfrontPrivateKey } from "./misc";
import { infraQueue } from "./queues";
import { appsyncEventApi } from "./realtime";
import { router, routerSecret } from "./router";

export const api = new custom.aws.Function("Api", {
  handler: "packages/functions/node/src/api/index.handler",
  url: true,
  link: [
    appData,
    auth,
    aws_,
    appsyncEventApi,
    cloudfrontPrivateKey,
    dsqlCluster,
    infraQueue,
    router,
    routerSecret,
    temporaryBucket,
    userActivityTable,
  ],
  permissions: [
    {
      actions: ["sts:AssumeRole"],
      resources: [
        $interpolate`arn:aws:iam::${aws_.properties.account.id}:role/*`,
      ],
    },
  ],
});
router.route("/api", api.url, {
  rewrite: {
    regex: "^/api/(.*)$",
    to: "/$1",
  },
});

export const apiReverseProxyWorker = new sst.cloudflare.Worker(
  "ApiReverseProxyWorker",
  {
    handler: "packages/workers/src/api-reverse-proxy/index.ts",
    link: [auth, router],
    url: false,
    // NOTE: In the future when the cloudflare rate limiting api is generally available and
    // pulumi/sst supports the binding, we can remove this transform and bind directly to
    // the rate limiters instead of binding to another worker with the rate limiter bindings.
    transform: {
      worker: {
        serviceBindings: [
          {
            name: Constants.SERVICE_BINDING_NAMES.API_RATE_LIMITERS,
            service: "printdesk-api-rate-limiters",
          },
        ],
      },
    },
  },
);

export const apiReverseProxyRoute = new cloudflare.WorkersRoute(
  "ApiReverseProxyRoute",
  {
    zoneId: zone.id,
    pattern: $interpolate`${fqdn}/api/*`,
    scriptName: apiReverseProxyWorker.nodes.worker.name,
  },
);

export const outputs = {
  api: $interpolate`https://${fqdn}/api`,
};
