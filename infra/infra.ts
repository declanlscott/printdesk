import Path from "node:path";

import { Constants } from "@printdesk/core/utils/constants";

import { api } from "./api";
import { assetsBucket, assetsBucketAccessPointTemplate, assetsRouter } from "./assets";
import { issuer } from "./auth";
import { appconfigApplication, appconfigEnvironment, appconfigRoleTemplate } from "./config";
import { dynamo } from "./db";
import { hostnames, zone } from "./dns";
import * as lib from "./lib";
import {
  invoicesProcessorQueueSenderRoleTemplate,
  papercutApiAuthTokenConfigurationProfileTemplate,
  papercutApiGatewayAwsAccessKey,
  papercutApiGatewayOauthClientConfigurationProfileTemplate,
  papercutApiGatewayScriptObject,
  papercutSync,
} from "./papercut";
import {
  realtimeApi,
  realtimePublicChannelNamespacePublisherRole,
  realtimeTenantChannelNamespacePublisherRoleTemplate,
  realtimeTenantChannelNamespaceSubscriberRoleTemplate,
} from "./realtime";
import { aws_, cloudflare_, nanoId, snsTopicEmail } from "./utils";

export const pulumiBucket = new sst.aws.Bucket("PulumiBucket");

const pulumiPassphrase = new random.RandomPassword("PulumiPassphrase", { length: 32 }).result;

export const pulumiRole = new lib.aws.iam.ExternalRole("PulumiRole", {
  transform: { role: { managedPolicyArns: [aws.iam.ManagedPolicy.AdministratorAccess] } },
});

export const infraManagerFailureTopic = new sst.aws.SnsTopic("InfraManagerFailureTopic");
export const infraManagerFailureTopicEmailSubscription = new aws.sns.TopicSubscription(
  "InfraManagerFailureTopicEmailSubscription",
  { topic: infraManagerFailureTopic.arn, protocol: "email", endpoint: snsTopicEmail.value },
);

export const infraManager = dynamo.subscribe(
  "InfraManager",
  {
    runtime: "python3.14",
    python: { container: true },
    handler: "packages/python/functions/infra_manager/main.handler",
    timeout: "900 seconds",
    ...($dev ? {} : { memory: "3008 MB", storage: "1536 MB" }),
    environment: {
      PULUMI_CONFIG_PASSPHRASE: pulumiPassphrase,
      ...($dev
        ? {
            PULUMI_HONE: Path.join(
              $cli.paths.root,
              "packages/python/functions/infra_manager/pulumi_home",
            ),
          }
        : {}),
    },
    link: [
      api,
      appconfigApplication,
      appconfigEnvironment,
      appconfigRoleTemplate,
      assetsBucket,
      assetsBucketAccessPointTemplate,
      assetsRouter,
      aws_,
      cloudflare_,
      dynamo,
      hostnames,
      infraManagerFailureTopic,
      invoicesProcessorQueueSenderRoleTemplate,
      issuer,
      nanoId,
      papercutApiAuthTokenConfigurationProfileTemplate,
      papercutApiGatewayAwsAccessKey,
      papercutApiGatewayOauthClientConfigurationProfileTemplate,
      papercutApiGatewayScriptObject,
      papercutSync,
      pulumiBucket,
      pulumiRole,
      realtimeApi,
      realtimePublicChannelNamespacePublisherRole,
      realtimeTenantChannelNamespacePublisherRoleTemplate,
      realtimeTenantChannelNamespaceSubscriberRoleTemplate,
      zone,
    ],
  },
  {
    filters: [
      {
        dynamodb: {
          Keys: {
            [Constants.DYNAMO_KEYS.PK]: {
              S: [{ prefix: Constants.KEY_LITERALS.TENANT + Constants.SEPARATOR }],
            },
            [Constants.DYNAMO_KEYS.SK]: {
              S: [Constants.KEY_LITERALS.INFRA, Constants.KEY_LITERALS.INPUT].join(
                Constants.SEPARATOR,
              ),
            },
          },
        },
      },
    ],
    transform: {
      eventSourceMapping: {
        batchSize: 1,
        maximumRetryAttempts: 3,
        functionResponseTypes: ["ReportBatchItemFailures"],
        destinationConfig: { onFailure: { destinationArn: infraManagerFailureTopic.arn } },
      },
    },
  },
);
