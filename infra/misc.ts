import { Constants } from "@printdesk/core/utils/constants";

sst.Linkable.wrap(aws.apigatewayv2.VpcLink, (vpcLink) => ({
  properties: {
    id: vpcLink.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.CachePolicy, (cachePolicy) => ({
  properties: {
    id: cachePolicy.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.Function, (fn) => ({
  properties: {
    arn: fn.arn,
  },
}));

sst.Linkable.wrap(aws.cloudfront.KeyGroup, (keyGroup) => ({
  properties: {
    id: keyGroup.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.OriginAccessControl, (oac) => ({
  properties: {
    id: oac.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.PublicKey, (publicKey) => ({
  properties: {
    id: publicKey.id,
  },
}));

sst.Linkable.wrap(aws.iam.Role, (role) => ({
  properties: {
    name: role.name,
    arn: role.arn,
  },
  include: [
    sst.aws.permission({
      actions: ["sts:AssumeRole"],
      resources: [role.arn],
    }),
  ],
}));

sst.Linkable.wrap(aws.ssm.Parameter, (parameter) => ({
  properties: {
    name: parameter.name,
    arn: parameter.arn,
  },
}));

sst.Linkable.wrap(awsx.ecr.Image, (image) => ({
  properties: {
    uri: image.imageUri,
  },
}));

sst.Linkable.wrap(random.RandomPassword, (password) => ({
  properties: {
    value: password.result,
  },
}));

sst.Linkable.wrap(sst.aws.Cluster, (cluster) => ({
  properties: {
    name: cluster.nodes.cluster.name,
    arn: cluster.nodes.cluster.arn,
  },
}));

sst.Linkable.wrap(sst.aws.Dynamo, (table) => ({
  properties: {
    name: table.name,
    arn: table.arn,
  },
  include: [
    sst.aws.permission({
      actions: ["dynamodb:*"],
      resources: [table.arn, $interpolate`${table.arn}/*`],
    }),
  ],
}));

$transform(sst.aws.Function, (args) => {
  args.architecture ??= "arm64";
  args.runtime ??= "nodejs22.x";
});

sst.Linkable.wrap(tls.PrivateKey, (privateKey) => ({
  properties: {
    pem: privateKey.privateKeyPem,
  },
}));

export const isDevMode = $dev;
export const isProdStage = $app.stage === "production";

export const resourcePrefix = "SST_RESOURCE_";
export const resourceFileName = "resource.enc";

export const cloudflareAccountId = new sst.Secret("CloudflareAccountId");

export const appData = new sst.Linkable("AppData", {
  properties: {
    name: $app.name,
    stage: $app.stage,
    isDevMode,
    isProdStage,
  },
});

export const aws_ = new sst.Linkable("Aws", {
  properties: {
    account: { id: aws.getCallerIdentityOutput().accountId },
    region: aws.getRegionOutput().name,
  },
});

export const cloudflare_ = new sst.Linkable("Cloudflare", {
  properties: {
    account: { id: cloudflareAccountId.value },
  },
});

export const headerKeys = new sst.Linkable("HeaderKeys", {
  properties: Constants.HEADER_KEYS,
});

export const budgetEmail = new sst.Secret("BudgetEmail");
export const budget = new aws.budgets.Budget("Budget", {
  budgetType: "COST",
  limitAmount: "1",
  limitUnit: "USD",
  timeUnit: "MONTHLY",
  notifications: [
    {
      comparisonOperator: "GREATER_THAN",
      threshold: 100,
      thresholdType: "PERCENTAGE",
      notificationType: "FORECASTED",
      subscriberEmailAddresses: [budgetEmail.value],
    },
  ],
});
