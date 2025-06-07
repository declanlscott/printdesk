import { identityProviders, issuer } from "./auth";
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
  tenantRoles,
} from "./iam";
import { appData, aws_ } from "./misc";
import { appsyncEventApi } from "./realtime";
import { infraQueue, temporaryBucket } from "./storage";

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
    aws_,
    cloudfrontPublicKey,
    cloudfrontPrivateKey,
    domains,
    dsqlCluster,
    identityProviders,
    infraQueue,
    issuer,
    realtimePublisherRole,
    realtimePublisherRoleExternalId,
    realtimeSubscriberRole,
    realtimeSubscriberRoleExternalId,
    routerSecret,
    temporaryBucket,
    tenantRoles,
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
