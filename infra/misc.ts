import { domainName, fqdn } from "./dns";
import {
  organization,
  organizationManagementRole,
  tenantAccountAccessRoleName,
  tenantsOrganizationalUnit,
} from "./organization";
import { realtimePublisherRole, realtimeSubscriberRole } from "./realtime";

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

export const aws_ = new sst.Linkable("Aws", {
  properties: {
    organization: {
      id: organization.id,
      email: organization.masterAccountEmail,
      managementRole: {
        arn: organizationManagementRole.arn,
      },
      tenantsOrganizationalUnit: {
        id: tenantsOrganizationalUnit.id,
      },
    },
    account: {
      id: aws.getCallerIdentityOutput().accountId,
    },
    region: aws.getRegionOutput().name,
    tenant: {
      roles: {
        accountAccess: { name: tenantAccountAccessRoleName },
        realtimeSubscriber: { name: "TenantRealtimeSubscriberRole" },
        realtimePublisher: { name: "TenantRealtimePublisherRole" },
        bucketsAccess: { name: "TenantBucketsAccessRole" },
        putParameters: { name: "TenantPutParametersRole" },
      },
    },
    roles: {
      realtimeSubscriber: { arn: realtimeSubscriberRole.arn },
      realtimePublisher: { arn: realtimePublisherRole.arn },
    },
  },
});

export const cloudflare_ = new sst.Linkable("Cloudflare", {
  properties: {
    account: {
      id: cloudflareAccountId.value,
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

export const cloudfrontPublicKey = new sst.Linkable("CloudfrontPublicKey", {
  properties: {
    pem: cloudfrontPrivateKey.publicKeyPem,
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
      subscriberEmailAddresses: [organization.masterAccountEmail],
    },
  ],
});
