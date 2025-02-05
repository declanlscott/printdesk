import { domainName, fqdn } from "./dns";
import {
  pulumiRole,
  realtimePublisherRole,
  realtimeSubscriberRole,
} from "./roles";

export const isDev = $dev;

export const cloudflareAccountId = new sst.Secret("CloudflareAccountId");

export const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");

export const appData = new sst.Linkable("AppData", {
  properties: {
    name: $app.name,
    stage: $app.stage,
    isDev,
    domainName: {
      value: domainName.value,
      fullyQualified: fqdn,
    },
  },
});

sst.Linkable.wrap(tls.PrivateKey, (privateKey) => ({
  properties: {
    pem: privateKey.privateKeyPem,
  },
}));

export const cloudfrontPrivateKey = new tls.PrivateKey("CloudfrontPrivateKey", {
  algorithm: "RSA",
  rsaBits: 2048,
});

export const cloudfrontPublicKey = new aws.cloudfront.PublicKey(
  "CloudfrontPublicKey",
  { encodedKey: cloudfrontPrivateKey.publicKeyPem },
);

export const cloudfrontKeyGroup = new aws.cloudfront.KeyGroup(
  "CloudfrontKeyGroup",
  { items: [cloudfrontPublicKey.id] },
);

export const cloudfrontApiCachePolicy = new aws.cloudfront.CachePolicy(
  "CloudfrontApiCachePolicy",
  {
    defaultTtl: 0,
    minTtl: 0,
    maxTtl: 31536000, // 1 year
    parametersInCacheKeyAndForwardedToOrigin: {
      cookiesConfig: {
        cookieBehavior: "none",
      },
      headersConfig: {
        headerBehavior: "none",
      },
      queryStringsConfig: {
        queryStringBehavior: "none",
      },
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    },
  },
);

export const cloudfrontS3OriginAccessControl =
  new aws.cloudfront.OriginAccessControl("CloudfrontS3OriginAccessControl", {
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  });

export const cloudfrontRewriteUriFunction = new aws.cloudfront.Function(
  "CloudfrontRewriteUriFunction",
  {
    runtime: "cloudfront-js-2.0",
    code: [
      `function handler(event) {`,
      `  let request = event.request;`,
      `  request.uri = request.uri.replace(/^\\/[^\\/]*\\//, "/");`,
      `  return request;`,
      `}`,
    ].join("\n"),
  },
);

// Group of non-sensitive AWS metadata
export const aws_ = new sst.Linkable("Aws", {
  properties: {
    account: { id: aws.getCallerIdentityOutput().accountId },
    region: aws.getRegionOutput().name,
    tenant: {
      roles: {
        apiAccess: {
          nameTemplate: `pw-${$app.stage}-{{tenant_id}}-ApiAccessRole`,
        },
        realtimeSubscriber: {
          nameTemplate: `pw-${$app.stage}-{{tenant_id}}-RealtimeSubscriberRole`,
        },
        realtimePublisher: {
          nameTemplate: `pw-${$app.stage}-{{tenant_id}}-RealtimePublisherRole`,
        },
        bucketsAccess: {
          nameTemplate: `pw-${$app.stage}-{{tenant_id}}-BucketsAccessRole`,
        },
        putParameters: {
          nameTemplate: `pw-${$app.stage}-{{tenant_id}}-PutParametersRole`,
        },
      },
      parameters: {
        documentsMimeTypes: {
          nameTemplate: `/${$app.name}/${$app.stage}/tenant/{{tenant_id}}/app/settings/documents/mime-types`,
        },
        documentsSizeLimit: {
          nameTemplate: `/${$app.name}/${$app.stage}/tenant/{{tenant_id}}/app/settings/documents/size-limit`,
        },
        tailnetPapercutServerUri: {
          nameTemplate: `/${$app.name}/${$app.stage}/tenant/{{tenant_id}}/papercut/server/tailnet-uri`,
        },
        papercutServerAuthToken: {
          nameTemplate: `/${$app.name}/${$app.stage}/tenant/{{tenant_id}}/papercut/server/auth-token`,
        },
        tailscaleOauthClient: {
          nameTemplate: `/${$app.name}/${$app.stage}/tenant/{{tenant_id}}/tailscale/oauth-client`,
        },
      },
    },
    roles: {
      realtimeSubscriber: { arn: realtimeSubscriberRole.arn },
      realtimePublisher: { arn: realtimePublisherRole.arn },
      pulumi: { arn: pulumiRole.arn },
    },
    cloudfront: {
      keyPair: { id: cloudfrontPublicKey.id },
      keyGroup: { id: cloudfrontKeyGroup.id },
      apiCachePolicy: { id: cloudfrontApiCachePolicy.id },
      s3OriginAccessControl: { id: cloudfrontS3OriginAccessControl.id },
      rewriteUriFunction: { arn: cloudfrontRewriteUriFunction.arn },
    },
  },
});

export const cloudflare_ = new sst.Linkable("Cloudflare", {
  properties: {
    account: { id: cloudflareAccountId.value },
  },
});

export const cloudflareApiTokenParameter = new aws.ssm.Parameter(
  "CloudflareApiToken",
  {
    name: `/${$app.name}/${$app.stage}/cloudflare/api-token`,
    type: aws.ssm.ParameterType.SecureString,
    value: process.env.CLOUDFLARE_API_TOKEN!,
  },
);

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
