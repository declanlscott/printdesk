import { apiFunction } from "./api";
import { codeBucket, pulumiBucket } from "./buckets";
import * as custom from "./custom";
import { dbMigratorInvocationSuccessResult, dsqlCluster } from "./db";
import {
  appData,
  aws_,
  cloudflareApiTokenParameter,
  cloudfrontPrivateKey,
} from "./misc";
import { infraQueue } from "./queues";
import { appsyncEventApi } from "./realtime";
import { infraFunctionRole, pulumiRole, realtimePublisherRole } from "./roles";
import { injectLinkables, normalizePath } from "./utils";

export const repository = new awsx.ecr.Repository(
  "Repository",
  { forceDelete: true },
  { retainOnDelete: $app.stage === "production" },
);

export const papercutSync = new custom.aws.Function("PapercutSync", {
  handler: "packages/functions/node/src/papercut-sync.handler",
  timeout: "20 seconds",
  link: [appData, aws_, cloudfrontPrivateKey, dsqlCluster],
});

export const invoicesProcessor = new custom.aws.Function("InvoicesProcessor", {
  handler: "packages/functions/node/src/invoices-processor.handler",
  timeout: "20 seconds",
  link: [appData, cloudfrontPrivateKey, dsqlCluster],
  permissions: [
    {
      actions: [
        "sqs:ChangeMessageVisibility",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
      ],
      resources: ["*"],
    },
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

const infraFunctionDir = normalizePath("packages/functions/python/infra");

const infraFunctionResourceData = $util.jsonStringify(
  injectLinkables({
    AppData: appData,
    ApiFunction: apiFunction,
    AppsyncEventApi: appsyncEventApi,
    Aws: aws_,
    Code: code,
    InvoicesProcessor: invoicesProcessor,
    PapercutSync: papercutSync,
    PulumiBucket: pulumiBucket,
  }),
);

const infraFunctionResourceBuilder = new command.local.Command(
  "InfraFunctionResourceBuilder",
  {
    dir: infraFunctionDir,
    create: $interpolate`echo '${infraFunctionResourceData}' > resource.json`,
    triggers: [infraFunctionResourceData],
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
  { dependsOn: [infraFunctionResourceBuilder] },
);

new aws.iam.RolePolicy("InfraFunctionRoleInlinePolicy", {
  role: infraFunctionRole.name,
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
        actions: ["ssm:GetParameter"],
        resources: [cloudflareApiTokenParameter.arn],
      },
      {
        actions: ["kms:Decrypt"],
        resources: [aws.kms.getKeyOutput({ keyId: "alias/aws/ssm" }).arn],
      },
      {
        actions: ["sts:AssumeRole"],
        resources: [pulumiRole.arn, realtimePublisherRole.arn],
      },
    ],
  }).json,
});

const infraFunctionName = new custom.PhysicalName("InfraFunction", { max: 64 })
  .result;

export const infraLogGroup = new aws.cloudwatch.LogGroup("InfraLogGroup", {
  name: $interpolate`/aws/lambda/${infraFunctionName}`,
  retentionInDays: 14,
});

const pulumiPassphrase = new random.RandomPassword("PulumiPassphrase", {
  length: 32,
  special: true,
}).result;

export const infraFunction = new aws.lambda.Function("InfraFunction", {
  name: infraFunctionName,
  packageType: "Image",
  imageUri: infraFunctionImage.imageUri,
  role: infraFunctionRole.arn,
  timeout: 900,
  architectures: ["arm64"],
  memorySize: 3008,
  ephemeralStorage: { size: 1536 },
  loggingConfig: {
    logFormat: "Text",
    logGroup: infraLogGroup.name,
  },
  environment: {
    variables: {
      PULUMI_CONFIG_PASSPHRASE: pulumiPassphrase,
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

new aws.lambda.Invocation(
  "InfraDispatcherInvocation",
  {
    functionName: infraDispatcher.name,
    input: JSON.stringify({}),
    triggers: { infraFunction: infraFunction.lastModified },
  },
  { dependsOn: [dbMigratorInvocationSuccessResult] },
);
