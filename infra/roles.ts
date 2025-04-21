import { Constants } from "@printdesk/core/utils/constants";

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

export const realtimePublisherRole = new aws.iam.Role("RealtimePublisherRole", {
  assumeRolePolicy: realtimeAssumeRolePolicy,
});

export const infraFunctionRole = new aws.iam.Role("InfraFunctionRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
  managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
});

export const pulumiRole = new aws.iam.Role("PulumiRole", {
  assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        principals: [
          {
            type: "AWS",
            identifiers: [infraFunctionRole.arn],
          },
        ],
        actions: ["sts:AssumeRole"],
      },
    ],
  }).json,
  managedPolicyArns: [aws.iam.ManagedPolicy.AdministratorAccess],
});

export const tenantRoles = {
  apiAccess: {
    nameTemplate: `pd-${$app.stage}-${Constants.TENANT_ID_PLACEHOLDER}-ApiAccessRole`,
  },
  realtimeSubscriber: {
    nameTemplate: `pd-${$app.stage}-${Constants.TENANT_ID_PLACEHOLDER}-RealtimeSubscriberRole`,
  },
  realtimePublisher: {
    nameTemplate: `pd-${$app.stage}-${Constants.TENANT_ID_PLACEHOLDER}-RealtimePublisherRole`,
  },
  bucketsAccess: {
    nameTemplate: `pd-${$app.stage}-${Constants.TENANT_ID_PLACEHOLDER}-BucketsAccessRole`,
  },
  putParameters: {
    nameTemplate: `pd-${$app.stage}-${Constants.TENANT_ID_PLACEHOLDER}-PutParametersRole`,
  },
} as const;
