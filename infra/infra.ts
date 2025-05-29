import { api } from "./api";
import { identityProviders } from "./auth";
import {
  cloudfrontApiCachePolicy,
  cloudfrontKeyGroup,
  cloudfrontPrivateKey,
  cloudfrontPublicKey,
  cloudfrontRewriteUriFunction,
  cloudfrontS3OriginAccessControl,
} from "./cdn";
import * as custom from "./custom";
import { dbMigratorInvocationSuccess, dsqlCluster } from "./db";
import { domains } from "./dns";
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
  codeBucket,
  infraQueue,
  pulumiBucket,
  tenantParameters,
} from "./storage";
import { injectLinkables, normalizePath } from "./utils";

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

const papercutSecureReverseProxySrcPath = normalizePath(
  "packages/functions/go/papercut-secure-reverse-proxy",
);
const papercutSecureReverseProxySrcArchiver = await command.local.run({
  dir: papercutSecureReverseProxySrcPath,
  command: "",
  archivePaths: ["**", "!bin/**"],
});
const papercutSecureReverseProxyBuilderAssetPath = "bin/package.zip";
const papercutSecureReverseProxyBuilder = new command.local.Command(
  "PapercutSecureReverseProxyBuilder",
  {
    dir: papercutSecureReverseProxySrcPath,
    create: `GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/function/main.go && zip -j ${papercutSecureReverseProxyBuilderAssetPath} bin/bootstrap`,
    assetPaths: [papercutSecureReverseProxyBuilderAssetPath],
    triggers: [papercutSecureReverseProxySrcArchiver.archive],
  },
);
export const papercutSecureReverseProxyObject = new aws.s3.BucketObjectv2(
  "PapercutSecureReverseProxyObject",
  {
    bucket: codeBucket.name,
    key: "functions/papercut-secure-reverse-proxy/package.zip",
    source: papercutSecureReverseProxyBuilder.assets.apply((assets) => {
      const asset = assets?.[papercutSecureReverseProxyBuilderAssetPath];
      if (!asset)
        throw new Error("Missing papercut secure reverse proxy build asset");

      return asset;
    }),
  },
);

export const code = new sst.Linkable("Code", {
  properties: {
    bucket: {
      name: codeBucket.name,
      object: {
        papercutSecureReverseProxy: {
          key: papercutSecureReverseProxyObject.key,
          versionId: papercutSecureReverseProxyObject.versionId,
        },
      },
    },
  },
});

export const repository = new awsx.ecr.Repository(
  "Repository",
  { forceDelete: true },
  { retainOnDelete: isProdStage },
);

const infraFunctionDir = normalizePath("packages/functions/python/infra");
const infraFunctionResourceFileName = "resource.enc";

const infraFunctionResourceCiphertext = new custom.Ciphertext(
  "InfraFunctionResourceCiphertext",
  {
    plaintext: $jsonStringify(
      injectLinkables(
        "CUSTOM_SST_RESOURCE_",
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
        code,
        domains,
        invoicesProcessor,
        papercutSync,
        pulumiBucket,
        pulumiRole,
        pulumiRoleExternalId,
        realtimePublisherRole,
        realtimePublisherRoleExternalId,
        tenantParameters,
        tenantRoles,
      ),
    ),
    writeToFile: normalizePath(infraFunctionResourceFileName, infraFunctionDir),
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
