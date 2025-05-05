import { auth } from "./auth";
import { temporaryBucket } from "./buckets";
import * as custom from "./custom";
import { dsqlCluster, userActivityTable } from "./db";
import { fqdn } from "./dns";
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

export const outputs = {
  api: $interpolate`https://${fqdn}/api`,
};
