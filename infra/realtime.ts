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

const realtimeAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      principals: [
        {
          type: "AWS",
          identifiers: ["*"],
        },
      ],
      actions: ["sts:AssumeRole"],
    },
  ],
}).json;

export const realtimeSubscriberRole = new aws.iam.Role(
  "RealtimeSubscriberRole",
  { assumeRolePolicy: realtimeAssumeRolePolicy },
);
new aws.iam.RolePolicy("RealtimeSubscriberRoleInlinePolicy", {
  role: realtimeSubscriberRole.name,
  policy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        actions: ["appsync:EventConnect"],
        resources: [appsyncEventApi.apiArn],
      },
      {
        actions: ["appsync:EventSubscribe"],
        resources: [$interpolate`${appsyncEventApi.apiArn}/*`],
      },
    ],
  }).json,
});

export const realtimePublisherRole = new aws.iam.Role("RealtimePublisherRole", {
  assumeRolePolicy: realtimeAssumeRolePolicy,
});
new aws.iam.RolePolicy("RealtimePublisherRoleInlinePolicy", {
  role: realtimePublisherRole.name,
  policy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        actions: ["appsync:EventPublish"],
        resources: [$interpolate`${appsyncEventApi.apiArn}/*`],
      },
    ],
  }).json,
});
