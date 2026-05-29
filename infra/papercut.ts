import { resolve, join } from "node:path";

import { assetsBucket } from "./assets";
import { invokeIssuerFunctionUrl } from "./auth";
import { dsql } from "./db";
import { hostnames } from "./dns";
import * as lib from "./lib";

import { siteBuilder } from "~/sst/aws/helpers/site-builder";
import { VisibleError } from "~/sst/error";

export const invoicesProcessorQueueSenderRoleTemplate = new lib.templates.aws.iam.Role(
  "InvoicesProcessorQueueSenderRoleTemplate",
  { identifier: "InvoicesSenderRole" },
);

export const papercutApiGatewayOauthClientConfigurationProfileTemplate =
  new lib.templates.aws.appconfig.ConfigurationProfile(
    "PapercutApiGatewayOauthClientConfigurationProfileTemplate",
    { identifier: "PapercutApiGatewayOauthClient" },
  );

export const papercutApiAuthTokenConfigurationProfileTemplate =
  new lib.templates.aws.appconfig.ConfigurationProfile(
    "PapercutApiAuthTokenConfigurationProfileTemplate",
    { identifier: "PapercutApiAuthToken" },
  );

const papercutApiGatewayPackagePath = resolve(
  join($cli.paths.root, "packages/typescript/functions/papercut-api-gateway"),
);
const papercutApiGatewayScriptOutDir = "dist";
const papercutApiGatewayScriptAssetPath = `${papercutApiGatewayScriptOutDir}/index.js`;
export const papercutApiGatewayScriptBuilder = siteBuilder("PapercutApiGatewayScriptBuilder", {
  create: `vpx wrangler deploy --dry-run --outdir ${papercutApiGatewayScriptOutDir} --minify`,
  dir: papercutApiGatewayPackagePath,
  triggers: [Date.now()],
  assetPaths: [papercutApiGatewayScriptAssetPath],
});

export const papercutApiGatewayScriptSource = papercutApiGatewayScriptBuilder.assets.apply(
  (assets) => {
    const asset = assets?.[papercutApiGatewayScriptAssetPath];
    if (!asset || asset instanceof $util.asset.Archive)
      throw new VisibleError(`Missing asset at ${papercutApiGatewayScriptAssetPath}`);

    return asset;
  },
);

export const papercutApiGatewayScriptObject = new aws.s3.BucketObjectv2(
  "PapercutApiGatewayScriptObject",
  {
    bucket: assetsBucket.name,
    key: "code/papercut-api-gateway.js",
    source: papercutApiGatewayScriptSource,
    contentType: "text/javascript",
  },
);

export const papercutApiGatewayAwsAccessKey = new lib.aws.iam.AccessKey(
  "PapercutApiGatewayAwsAccessKey",
  { permissions: [invokeIssuerFunctionUrl] },
);

export const papercutSync = new lib.aws.lambda.Function("PapercutSync", {
  handler: "packages/typescript/functions/papercut-sync/src/index.handler",
  link: [dsql, hostnames, papercutApiAuthTokenConfigurationProfileTemplate],
});

export const invoicesProcessor = new lib.aws.lambda.Function("InvoicesProcessor", {
  handler: "packages/typescript/functions/invoices-processor/src/index.handler",
  link: [dsql, hostnames, papercutApiAuthTokenConfigurationProfileTemplate],
});
