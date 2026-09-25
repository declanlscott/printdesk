import { identityProviders, invokeIssuerFunctionUrl, issuer } from "./auth";
import { hostnames } from "./dns";
import * as lib from "./lib";
import { aws_, cloudflare_ } from "./utils";

export const r2S3AccessKeyId = new sst.Secret("R2S3AccessKeyId");
export const r2S3SecretAccessKey = new sst.Secret("R2S3SecretAccessKey");
export const r2S3Credentials = new sst.Linkable("R2S3Credentials", {
  properties: {
    accessKeyId: r2S3AccessKeyId.value,
    secretAccessKey: r2S3SecretAccessKey.value,
  },
});

export const assetsBucketTemplate = new lib.templates.cloudflare.r2.Bucket("AssetsBucketTemplate", {
  identifier: "assets-bucket",
});

export const assetsAwsPermissions = new sst.Linkable("AssetsAwsPermissions", {
  properties: {},
  include: [invokeIssuerFunctionUrl],
});

export const assetsInvalidationQueue = new sst.cloudflare.Queue("AssetsInvalidationQueue");
export const assetsInvalidationQueueProperties = new sst.Linkable(
  "AssetsInvalidationQueueProperties",
  { properties: { id: assetsInvalidationQueue.id } },
);

export const userAvatarsQueue = new sst.cloudflare.Queue("UserAvatarsQueue");
export const userAvatarsQueueProperties = new sst.Linkable("UserAvatarsQueueProperties", {
  properties: { id: userAvatarsQueue.id },
});

export const assets = new lib.cloudflare.Worker("AssetsWorker", {
  handler: "packages/typescript/functions/assets/src/index.ts",
  domains: { assets: hostnames.properties.assets },
  link: [
    assetsBucketTemplate,
    assetsInvalidationQueue,
    aws_,
    cloudflare_,
    identityProviders,
    issuer,
    r2S3Credentials,
    userAvatarsQueue,
  ],
});

export const codeBucket = new sst.aws.Bucket("CodeBucket");
