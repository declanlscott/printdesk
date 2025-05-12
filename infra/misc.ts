sst.Linkable.wrap(tls.PrivateKey, (privateKey) => ({
  properties: {
    pem: privateKey.privateKeyPem,
  },
}));

sst.Linkable.wrap(random.RandomPassword, (password) => ({
  properties: {
    value: password.result,
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

sst.Linkable.wrap(aws.cloudfront.PublicKey, (publicKey) => ({
  properties: {
    id: publicKey.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.KeyGroup, (keyGroup) => ({
  properties: {
    id: keyGroup.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.CachePolicy, (cachePolicy) => ({
  properties: {
    id: cachePolicy.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.OriginAccessControl, (oac) => ({
  properties: {
    id: oac.id,
  },
}));

sst.Linkable.wrap(aws.cloudfront.Function, (fn) => ({
  properties: {
    arn: fn.arn,
  },
}));

export const isDevMode = $dev;
export const isProdStage = $app.stage === "production";

export const cloudflareAccountId = new sst.Secret("CloudflareAccountId");

export const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");

export const temporaryBucket = new sst.aws.Bucket("TemporaryBucket");
export const temporaryBucketLifecycle =
  new aws.s3.BucketLifecycleConfigurationV2("TemporaryBucketLifecycle", {
    bucket: temporaryBucket.name,
    rules: [
      {
        id: "daily",
        status: "Enabled",
        filter: { prefix: "daily/" },
        expiration: { days: 1 },
      },
      {
        id: "weekly",
        status: "Enabled",
        filter: { prefix: "weekly/" },
        expiration: { days: 7 },
      },
      {
        id: "monthly",
        status: "Enabled",
        filter: { prefix: "monthly/" },
        expiration: { days: 30 },
      },
    ],
  });

export const appData = new sst.Linkable("AppData", {
  properties: {
    name: $app.name,
    stage: $app.stage,
    isDevMode,
    isProdStage,
  },
});

export const cloudData = new sst.Linkable("CloudData", {
  properties: {
    aws: {
      account: { id: aws.getCallerIdentityOutput().accountId },
      region: aws.getRegionOutput().name,
    },
    cloudflare: {
      account: { id: cloudflareAccountId.value },
    },
  },
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
