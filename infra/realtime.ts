import { useProvider } from "~/sst/aws/helpers/provider";

import { hostnames } from "./dns";
import * as lib from "./lib";

export const realtimeApi = new aws.appsync.Api("RealtimeApi", {
  eventConfig: {
    authProviders: [{ authType: "AWS_IAM" }],
    connectionAuthModes: [{ authType: "AWS_IAM" }],
    defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
    defaultSubscribeAuthModes: [{ authType: "AWS_IAM" }],
  },
});

export const publicChannelNamespace = new aws.appsync.ChannelNamespace(
  "RealtimePublicChannelNamespace",
  { apiId: realtimeApi.apiId, name: "public" },
);

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

export const realtimePublicChannelNamespacePublisherRole = new lib.aws.iam.ExternalRole(
  "RealtimePublicChannelNamespacePublisherRole",
  {
    transform: {
      role: {
        inlinePolicies: [
          {
            policy: aws.iam.getPolicyDocumentOutput({
              statements: [
                {
                  actions: ["appsync:EventPublish"],
                  resources: [publicChannelNamespace.channelNamespaceArn],
                },
              ],
            }).json,
          },
        ],
      },
    },
  },
);

export const realtimePublicChannelNamespaceSubscriberRole = new lib.aws.iam.ExternalRole(
  "RealtimePublicChannelNamespaceSubscriberRole",
  {
    transform: {
      role: {
        inlinePolicies: [
          {
            policy: aws.iam.getPolicyDocumentOutput({
              statements: [
                {
                  actions: ["appsync:EventConnect"],
                  resources: [realtimeApi.apiArn],
                },
                {
                  actions: ["appsync:EventSubscribe"],
                  resources: [publicChannelNamespace.channelNamespaceArn],
                },
              ],
            }).json,
          },
        ],
      },
    },
  },
);

export const realtimeTenantChannelNamespacePublisherRoleTemplate = new lib.templates.aws.iam.Role(
  "RealtimeTenantChannelNamespacePublisherRoleTemplate",
  { identifier: "RealtimePublisherRole" },
);

export const realtimeTenantChannelNamespaceSubscriberRoleTemplate = new lib.templates.aws.iam.Role(
  "RealtimeTenantChannelNamespaceSubscriberRoleTemplate",
  { identifier: "RealtimeSubscriberRole" },
);
