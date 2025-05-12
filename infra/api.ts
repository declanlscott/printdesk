import { Constants } from "@printdesk/core/utils/constants";

import { issuer } from "./auth";
import {
  cloudfrontPrivateKey,
  cloudfrontPublicKey,
  router,
  routerSecret,
} from "./cdn";
import * as custom from "./custom";
import { dsqlCluster } from "./db";
import { domains } from "./dns";
import {
  realtimePublisherRole,
  realtimePublisherRoleExternalId,
  realtimeSubscriberRole,
  realtimeSubscriberRoleExternalId,
} from "./iam";
import { appData, temporaryBucket } from "./misc";
import { appsyncEventApi } from "./realtime";
import { infraQueue, userActivityTable } from "./storage";

userActivityTable.subscribe(
  "IncrementMonthlyActiveUsers",
  "packages/functions/node/src/increment-mau.handler",
  {
    filters: [
      {
        eventName: ["INSERT"],
        dynamodb: {
          NewImage: {
            [Constants.GSI.ONE.PK]: {
              S: [{ prefix: Constants.MONTH + Constants.TOKEN_DELIMITER }],
            },
            [Constants.GSI.ONE.SK]: {
              S: [{ prefix: Constants.USER + Constants.TOKEN_DELIMITER }],
            },
          },
        },
      },
    ],
  },
);

export const api = new custom.aws.Function("Api", {
  handler: "packages/functions/node/src/api/index.handler",
  url: {
    router: {
      instance: router,
      domain: domains.properties.api,
    },
  },
  link: [
    appData,
    appsyncEventApi,
    cloudfrontPublicKey,
    cloudfrontPrivateKey,
    dsqlCluster,
    infraQueue,
    issuer,
    realtimePublisherRole,
    realtimePublisherRoleExternalId,
    realtimeSubscriberRole,
    realtimeSubscriberRoleExternalId,
    routerSecret,
    temporaryBucket,
    userActivityTable,
  ],
  permissions: [
    {
      actions: ["sts:AssumeRole"],
      resources: [
        $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:role/*`,
      ],
    },
  ],
});

export const outputs = {
  api: api.url,
};
