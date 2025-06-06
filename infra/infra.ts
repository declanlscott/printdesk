import { api, invoicesProcessor, papercutSync } from "./api";
import {
  cloudfrontApiCachePolicy,
  cloudfrontKeyGroup,
  cloudfrontPublicKey,
  cloudfrontRewriteUriFunction,
  cloudfrontS3OriginAccessControl,
} from "./cdn";
import * as custom from "./custom";
import { configTable, dbMigratorInvocationSuccess, dsqlCluster } from "./db";
import { domains, tenantDomainTemplates } from "./dns";
import {
  cloudflareApiToken,
  pulumiRole,
  pulumiRoleExternalId,
  realtimePublisherRole,
  realtimePublisherRoleExternalId,
  tenantRoles,
} from "./iam";
import { appData, aws_, resourceFileName, resourcePrefix } from "./misc";
import { appsyncEventApi } from "./realtime";
import {
  papercutSecureReverseProxyImage,
  papercutSecureReverseProxyResourceCiphertext,
} from "./reverse-proxy";
import { infraQueue, pulumiBucket, repository, tenantBuckets } from "./storage";
import { injectLinkables, normalizePath } from "./utils";
import { vpc, vpcLink } from "./vpc";

const infraFunctionDir = normalizePath("packages/python/functions/infra");

const infraFunctionResourceCiphertext = new custom.Ciphertext(
  "InfraFunctionResourceCiphertext",
  {
    plaintext: $jsonStringify(
      injectLinkables(
        resourcePrefix,
        api,
        appData,
        appsyncEventApi,
        aws_,
        cloudflareApiToken,
        cloudfrontApiCachePolicy,
        cloudfrontKeyGroup,
        cloudfrontPublicKey,
        cloudfrontRewriteUriFunction,
        cloudfrontS3OriginAccessControl,
        configTable,
        domains,
        invoicesProcessor,
        papercutSecureReverseProxyImage,
        papercutSecureReverseProxyResourceCiphertext,
        papercutSync,
        pulumiBucket,
        pulumiRole,
        pulumiRoleExternalId,
        realtimePublisherRole,
        realtimePublisherRoleExternalId,
        tenantBuckets,
        tenantDomainTemplates,
        tenantRoles,
        vpc,
        vpcLink,
      ),
    ),
    writeToFile: normalizePath(resourceFileName, infraFunctionDir),
  },
);

export const infraFunctionImage = new awsx.ecr.Image(
  "InfraFunctionImage",
  {
    repositoryUrl: repository.url,
    context: infraFunctionDir,
    platform: "linux/arm64",
    imageTag: "latest",
  },
  { dependsOn: [infraFunctionResourceCiphertext] },
);

const infraFunctionName = new custom.PhysicalName("InfraFunction", { max: 64 });

export const infraFunctionRole = new aws.iam.Role("InfraFunctionRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
  managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
  inlinePolicies: [
    {
      policy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            actions: [
              "sqs:ChangeMessageVisibility",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
              "sqs:GetQueueUrl",
              "sqs:ReceiveMessage",
            ],
            resources: [infraQueue.arn],
          },
          {
            actions: ["s3:*"],
            resources: [pulumiBucket.arn, $interpolate`${pulumiBucket.arn}/*`],
          },
          {
            actions: ["sts:AssumeRole"],
            resources: [pulumiRole.arn, realtimePublisherRole.arn],
          },
        ],
      }).json,
    },
  ],
});

export const infraFunctionLogGroup = new aws.cloudwatch.LogGroup(
  "InfraFunctionLogGroup",
  {
    name: $interpolate`/aws/lambda/${infraFunctionName.result}`,
    retentionInDays: 14,
  },
);

const pulumiPassphrase = new random.RandomPassword("PulumiPassphrase", {
  length: 32,
  special: true,
});

export const infraFunction = new aws.lambda.Function("InfraFunction", {
  name: infraFunctionName.result,
  packageType: "Image",
  imageUri: infraFunctionImage.imageUri,
  role: infraFunctionRole.arn,
  timeout: 900,
  architectures: ["arm64"],
  memorySize: 3008,
  ephemeralStorage: { size: 1536 },
  loggingConfig: {
    logFormat: "Text",
    logGroup: infraFunctionLogGroup.name,
  },
  environment: {
    variables: {
      SST_KEY: infraFunctionResourceCiphertext.encryptionKey,
      SST_KEY_FILE: resourceFileName,
      PULUMI_CONFIG_PASSPHRASE: pulumiPassphrase.result,
    },
  },
});
new aws.lambda.EventSourceMapping("InfraFunctionEventSourceMapping", {
  eventSourceArn: infraQueue.arn,
  functionName: infraFunction.name,
  functionResponseTypes: ["ReportBatchItemFailures"],
  batchSize: 10,
  maximumBatchingWindowInSeconds: 0,
});

export const infraDispatcher = new sst.aws.Function("InfraDispatcher", {
  handler: "packages/functions/node/src/infra-dispatcher.handler",
  link: [aws_, dsqlCluster, infraQueue],
});

new aws.lambda.Invocation("InfraDispatcherInvocation", {
  functionName: infraDispatcher.name,
  input: JSON.stringify({}),
  triggers: {
    dbMigratorInvocationSuccess: $jsonStringify(dbMigratorInvocationSuccess),
    infraFunction: infraFunction.lastModified,
  },
});
