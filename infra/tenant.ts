import { physicalName } from "../.sst/platform/src/components/naming";
import { apiFunction } from "./api";
import * as custom from "./custom";
import { dsqlCluster } from "./db";
import {
  appData,
  aws_,
  cloudflare_,
  cloudflareApiTokenParameter,
  cloudfrontPrivateKey,
  cloudfrontPublicKey,
} from "./misc";
import { tenantsPrincipalOrgPath } from "./organization";
import { invoicesProcessorDeadLetterQueue, tenantInfraQueue } from "./queues";
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
          Principal: "*",
          Condition: {
            "ForAnyValue:StringEquals": {
              "aws:PrincipalOrgPaths": [tenantsPrincipalOrgPath],
            },
          },
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
  link: [appData, cloudfrontPrivateKey, dsqlCluster],
});
new aws.lambda.Permission("PapercutSyncSchedulePermission", {
  function: papercutSync.name,
  action: "lambda:InvokeFunction",
  principal: "scheduler.amazonaws.com",
  principalOrgId: aws_.properties.organization.id,
});
new aws.lambda.Permission("PapercutSyncRulePermission", {
  function: papercutSync.name,
  action: "lambda:InvokeFunction",
  principal: "events.amazonaws.com",
  principalOrgId: aws_.properties.organization.id,
});

export const invoicesProcessor = new custom.aws.Function("InvoicesProcessor", {
  handler: "packages/functions/node/src/invoices-processor.handler",
  timeout: "20 seconds",
  link: [
    appData,
    cloudfrontPrivateKey,
    dsqlCluster,
    invoicesProcessorDeadLetterQueue,
  ],
});
new aws.lambda.Permission("InvoicesProcessorRulePermission", {
  function: invoicesProcessor.name,
  action: "lambda:InvokeFunction",
  principal: "events.amazonaws.com",
  principalOrgId: aws_.properties.organization.id,
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
    create:
      "GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/function/main.go && zip -j bin/package.zip bin/bootstrap",
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

const tenantInfraSrc = await command.local.run({
  dir: normalizePath("packages/functions/node"),
  command: 'echo "Archiving tenant infra source code..."',
  archivePaths: [
    "src/tenant/infra/**",
    "!src/tenant/infra/dist/**",
    "package.json",
  ],
});
const tenantInfraBuilder = new command.local.Command("TenantInfraBuilder", {
  dir: normalizePath("packages/functions/node"),
  create: "pnpm run infra:build",
  triggers: [tenantInfraSrc.archive],
});

export const tenantInfraFunctionImage = new awsx.ecr.Image(
  "TenantInfraFunctionImage",
  {
    repositoryUrl: repository.url,
    context: normalizePath("packages/functions/node/src/tenant/infra"),
    platform: "linux/arm64",
    imageTag: "latest",
  },
  { dependsOn: [tenantInfraBuilder] },
);

export const tenantInfraFunctionRole = new aws.iam.Role(
  "TenantInfraFunctionRole",
  {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
    managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
  },
);
new aws.iam.RolePolicy("TenantInfraFunctionRoleInlinePolicy", {
  role: tenantInfraFunctionRole.name,
  policy: aws.iam.getPolicyDocumentOutput({
    statements: [
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
        resources: [aws_.properties.organization.managementRole.arn],
      },
    ],
  }).json,
});

const functionName = physicalName(64, "TenantInfraFunction");

export const tenantInfraLogGroup = new aws.cloudwatch.LogGroup(
  "TenantInfraLogGroup",
  {
    name: `/aws/lambda/${functionName}`,
    retentionInDays: 14,
  },
);

export const tenantInfraFunction = new aws.lambda.Function(
  "TenantInfraFunction",
  {
    name: functionName,
    packageType: "Image",
    imageUri: tenantInfraFunctionImage.imageUri,
    role: tenantInfraFunctionRole.arn,
    timeout: 900,
    architectures: ["arm64"],
    loggingConfig: {
      logFormat: "Text",
      logGroup: tenantInfraLogGroup.name,
    },
    environment: {
      variables: injectLinkables(
        {
          AppData: appData.getSSTLink().properties,
          ApiFunction: apiFunction.getSSTLink().properties,
          Aws: aws_.getSSTLink().properties,
          CloudfrontPublicKey: cloudfrontPublicKey.getSSTLink().properties,
          Code: code.getSSTLink().properties,
          InvoicesProcessor: invoicesProcessor.getSSTLink().properties,
          PapercutSync: papercutSync.getSSTLink().properties,
          PulumiBucket: pulumiBucket.getSSTLink().properties,
        },
        "FUNCTION_RESOURCE_",
      ),
    },
  },
);

export const tenantInfraDispatcher = new sst.aws.Function(
  "TenantInfraDispatcher",
  {
    handler: "packages/functions/node/src/tenant/infra-dispatcher.handler",
    url: { authorization: "iam" },
    link: [dsqlCluster, tenantInfraQueue],
  },
);
