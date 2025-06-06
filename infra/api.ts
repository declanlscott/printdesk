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

export const papercutSync = new custom.aws.Function("PapercutSync", {
  handler: "packages/functions/node/src/papercut-sync.handler",
  timeout: "20 seconds",
  link: [
    aws_,
    cloudfrontPublicKey,
    cloudfrontPrivateKey,
    domains,
    dsqlCluster,
    identityProviders,
  ],
});

export const invoicesProcessor = new custom.aws.Function("InvoicesProcessor", {
  handler: "packages/functions/node/src/invoices-processor.handler",
  timeout: "20 seconds",
  link: [aws_, cloudfrontPublicKey, cloudfrontPrivateKey, domains, dsqlCluster],
  permissions: [
    sst.aws.permission({
      actions: [
        "sqs:ChangeMessageVisibility",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
      ],
      resources: ["*"],
    }),
  ],
});

export const outputs = {
  api: api.url,
};
