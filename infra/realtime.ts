import * as custom from "./custom";

export const appsyncEventApi = new custom.aws.Appsync.Api("AppsyncEventApi", {
  eventConfig: {
    authProviders: [{ authType: "AWS_IAM" }],
    connectionAuthModes: [{ authType: "AWS_IAM" }],
    defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
    defaultSubscribeAuthModes: [{ authType: "AWS_IAM" }],
  },
});

export const eventsChannelNamespace = new custom.aws.Appsync.ChannelNamespace(
  "EventsChannelNamespace",
  {
    apiId: appsyncEventApi.apiId,
    name: "events",
  },
);
