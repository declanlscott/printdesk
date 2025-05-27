import { useProvider } from "~/.sst/platform/src/components/aws/helpers/provider";
import * as custom from "./custom";
import { domains } from "./dns";

export const appsyncEventApi = new custom.aws.Appsync.EventApi(
  "AppsyncEventApi",
  {
    eventConfig: {
      authProviders: [{ authType: "AWS_IAM" }],
      connectionAuthModes: [{ authType: "AWS_IAM" }],
      defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
      defaultSubscribeAuthModes: [{ authType: "AWS_IAM" }],
    },
  },
);

export const eventsChannelNamespace = new custom.aws.Appsync.ChannelNamespace(
  "EventsChannelNamespace",
  {
    apiId: appsyncEventApi.apiId,
    name: "events",
  },
);

export const certificate = new sst.aws.DnsValidatedCertificate(
  "RealtimeCertificate",
  {
    domainName: domains.properties.realtime,
    dns: sst.cloudflare.dns(),
  },
  { provider: useProvider("us-east-1") },
);

export const domainName = new aws.appsync.DomainName("RealtimeDomainName", {
  domainName: domains.properties.realtime,
  certificateArn: certificate.arn,
});

export const domainNameApiAssociation =
  new aws.appsync.DomainNameApiAssociation("RealtimeDomainNameApiAssociation", {
    apiId: appsyncEventApi.apiId,
    domainName: domainName.domainName,
  });

export const realtimeAlias = sst.cloudflare.dns().createAlias(
  "Realtime",
  {
    name: domainName.domainName,
    aliasName: domainName.appsyncDomainName,
    aliasZone: domainName.hostedZoneId,
  },
  {},
);
