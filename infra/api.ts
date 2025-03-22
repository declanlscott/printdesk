import { Constants } from "@printworks/core/utils/constants";

import { auth } from "./auth";
import { temporaryBucket } from "./buckets";
import * as custom from "./custom";
import { dsqlCluster, userActivityTable } from "./db";
import { apiFqdn } from "./dns";
import { appData, aws_, cloudfrontPrivateKey } from "./misc";
import { infraQueue } from "./queues";
import { appsyncEventApi } from "./realtime";

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

export const apiReverseProxy = new sst.cloudflare.Worker("ApiReverseProxy", {
  handler: "packages/workers/src/api-reverse-proxy/index.ts",
  link: [auth, api],
  url: false,
  domain: apiFqdn,
  // NOTE: In the future when cloudflare terraform provider v5 is released and
  // pulumi/sst supports it, we can remove this transform and bind the rate limiters
  // directly to the worker instead of binding to another worker with the rate limiters.
  transform: {
    worker: {
      serviceBindings: [
        {
          name: Constants.SERVICE_BINDING_NAMES.API_RATE_LIMITERS,
          service: "printworks-api-rate-limiters",
        },
      ],
    },
  },
});

export const outputs = {
  apiReverseProxy: apiReverseProxy.url,
};
