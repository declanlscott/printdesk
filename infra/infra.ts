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
import { aws_ } from "./misc";
import { appsyncEventApi } from "./realtime";
import {
  codeBucket,
  infraQueue,
  pulumiBucket,
  tenantParameters,
} from "./storage";
import { normalizePath } from "./utils";

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

const pulumiPassphrase = new random.RandomPassword("PulumiPassphrase", {
  length: 32,
  special: true,
});

const infraSubscription = infraQueue.subscribe({
  handler: "packages/functions/python/infra/src/main.handler",
  runtime: "python3.12",
  python: { container: true },
  timeout: "15 minutes",
  architecture: "arm64",
  memory: "3008 MB",
  storage: "1536 MB",
  link: [
    api,
    appsyncEventApi,
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
  ],
  environment: {
    PULUMI_CONFIG_PASSPHRASE: pulumiPassphrase.result,
  },
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
    infraFunction: infraSubscription.nodes.function.nodes.function.lastModified,
  },
});
