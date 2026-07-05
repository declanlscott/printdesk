import { hostnames } from "./dns";
import * as lib from "./lib";

import { useProvider } from "~/sst/aws/helpers/provider";

export const appsyncApi = new aws.appsync.Api("AppsyncApi", {
  eventConfig: {
    authProviders: [{ authType: "AWS_IAM" }],
    connectionAuthModes: [{ authType: "AWS_IAM" }],
    defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
    defaultSubscribeAuthModes: [{ authType: "AWS_IAM" }],
  },
});

export const appsyncCertificate = new sst.aws.DnsValidatedCertificate(
  "AppsyncCertificate",
  {
    domainName: hostnames.properties.realtime,
    dns: sst.cloudflare.dns(),
  },
  { provider: useProvider("us-east-1") },
);

export const appsyncDomainName = new aws.appsync.DomainName("AppsyncDomainName", {
  domainName: hostnames.properties.realtime,
  certificateArn: appsyncCertificate.arn,
});

export const appsyncDomainNameApiAssociation = new aws.appsync.DomainNameApiAssociation(
  "AppsyncDomainNameApiAssociation",
  {
    apiId: appsyncApi.apiId,
    domainName: appsyncDomainName.domainName,
  },
);

export const appsyncAlias = sst.cloudflare.dns({ proxy: true }).createAlias(
  "AppsyncAlias",
  {
    name: appsyncDomainName.domainName,
    aliasName: appsyncDomainName.appsyncDomainName,
    aliasZone: appsyncDomainName.hostedZoneId,
  },
  {},
);

export const appsyncChannelNamespacePublisherRoleTemplate = new lib.templates.aws.iam.Role(
  "AppsyncChannelNamespacePublisherRoleTemplate",
  { identifier: "AppsyncPublisherRole" },
);

export const appsyncChannelNamespaceSubscriberRoleTemplate = new lib.templates.aws.iam.Role(
  "AppsyncChannelNamespaceSubscriberRoleTemplate",
  { identifier: "AppsyncSubscriberRole" },
);
