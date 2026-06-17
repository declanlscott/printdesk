import { hostnames } from "./dns";
import * as lib from "./lib";

import { useProvider } from "~/sst/aws/helpers/provider";

export const realtimeApi = new aws.appsync.Api("RealtimeApi", {
  eventConfig: {
    authProviders: [{ authType: "AWS_IAM" }],
    connectionAuthModes: [{ authType: "AWS_IAM" }],
    defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
    defaultSubscribeAuthModes: [{ authType: "AWS_IAM" }],
  },
});

export const certificate = new sst.aws.DnsValidatedCertificate(
  "RealtimeCertificate",
  {
    domainName: hostnames.properties.realtime,
    dns: sst.cloudflare.dns(),
  },
  { provider: useProvider("us-east-1") },
);

export const domainName = new aws.appsync.DomainName("RealtimeDomainName", {
  domainName: hostnames.properties.realtime,
  certificateArn: certificate.arn,
});

export const domainNameApiAssociation = new aws.appsync.DomainNameApiAssociation(
  "RealtimeDomainNameApiAssociation",
  {
    apiId: realtimeApi.apiId,
    domainName: domainName.domainName,
  },
);

export const alias = sst.cloudflare.dns({ proxy: true }).createAlias(
  "Realtime",
  {
    name: domainName.domainName,
    aliasName: domainName.appsyncDomainName,
    aliasZone: domainName.hostedZoneId,
  },
  {},
);

export const realtimeChannelNamespacePublisherRoleTemplate = new lib.templates.aws.iam.Role(
  "RealtimeChannelNamespacePublisherRoleTemplate",
  { identifier: "RealtimePublisherRole" },
);

export const realtimeChannelNamespaceSubscriberRoleTemplate = new lib.templates.aws.iam.Role(
  "RealtimeChannelNamespaceSubscriberRoleTemplate",
  { identifier: "RealtimeSubscriberRole" },
);
