import { physicalName } from "../.sst/platform/src/components/naming";
import { apiFunction } from "./api";
import * as custom from "./custom";
import { dsqlCluster } from "./db";
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

export const codeBucket = new sst.aws.Bucket("CodeBucket", {
  versioning: true,
  transform: {
    policy: (args) => {
      args.policy = sst.aws.iamEdit(args.policy, (policy) => {
        policy.Statement.push({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
          Principal: { AWS: pulumiRole.arn },
        });
      });
    },
  },
});

export const pulumiBucket = new sst.aws.Bucket("PulumiBucket");

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
const papercutSecureReverseProxySrc = await command.local.run({
  dir: papercutSecureReverseProxySrcPath,
  command: 'echo "Archiving papercut secure reverse proxy source code..."',
  archivePaths: ["**", "!bin/**"],
});
const papercutSecureReverseProxyBuilderAssetPath = "bin/package.zip";
const papercutSecureReverseProxyBuilder = new command.local.Command(
  "PapercutSecureReverseProxyBuilder",
  {
    dir: papercutSecureReverseProxySrcPath,
    create: `GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/function/main.go && zip -j ${papercutSecureReverseProxyBuilderAssetPath} bin/bootstrap`,
    assetPaths: [papercutSecureReverseProxyBuilderAssetPath],
    triggers: [papercutSecureReverseProxySrc.archive],
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

const infraFunctionName = physicalName(64, "InfraFunction");

export const infraLogGroup = new aws.cloudwatch.LogGroup("InfraLogGroup", {
  name: `/aws/lambda/${infraFunctionName}`,
  retentionInDays: 14,
});

const pulumiPassphrase = new random.RandomPassword("PulumiPassphrase", {
  length: 32,
  special: true,
});

export const infraFunction = new aws.lambda.Function("InfraFunction", {
  name: infraFunctionName,
  packageType: "Image",
  imageUri: infraFunctionImage.imageUri,
  role: infraFunctionRole.arn,
  timeout: 900,
  architectures: ["arm64"],
  memorySize: 2048,
  ephemeralStorage: { size: 1536 },
  loggingConfig: {
    logFormat: "Text",
    logGroup: infraLogGroup.name,
  },
  environment: {
    variables: {
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
  url: { authorization: "iam" },
  link: [aws_, dsqlCluster, infraQueue],
});
