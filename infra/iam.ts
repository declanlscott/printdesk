import { appsyncEventApi } from "./realtime";
import { buildNameTemplate } from "./utils";

export const cloudflareApiToken = new sst.Linkable("CloudflareApiToken", {
  properties: {
    value: process.env.CLOUDFLARE_API_TOKEN!,
  },
});

export const papercutTailgateExecutionRole = new aws.iam.Role(
  "PapercutTailgateExecutionRole",
  {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ecs-tasks.amazonaws.com",
    }),
    managedPolicyArns: [aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy],
    inlinePolicies: [
      {
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["ssm:GetParameter"],
              resources: ["*"],
            },
            {
              actions: ["kms:Decrypt"],
              resources: [
                aws.kms.getAliasOutput({ name: "alias/aws/ssm" }).arn,
              ],
            },
          ],
        }).json,
      },
    ],
  },
);

export const pulumiRoleExternalId = new random.RandomPassword(
  "PulumiRoleExternalId",
  {
    length: 32,
    special: true,
  },
);

export const pulumiRole = new aws.iam.Role("PulumiRole", {
  assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        principals: [
          {
            type: "AWS",
            identifiers: [
              $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:root`,
            ],
          },
        ],
        actions: ["sts:AssumeRole"],
        conditions: [
          {
            test: "StringEquals",
            variable: "sts:ExternalId",
            values: [pulumiRoleExternalId.result],
          },
        ],
      },
    ],
  }).json,
  managedPolicyArns: [aws.iam.ManagedPolicy.AdministratorAccess],
});

export const realtimeSubscriberRoleExternalId = new random.RandomPassword(
  "RealtimeSubscriberRoleExternalId",
  {
    length: 32,
    special: true,
  },
);

export const realtimeSubscriberRole = new aws.iam.Role(
  "RealtimeSubscriberRole",
  {
    assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          principals: [
            {
              type: "AWS",
              identifiers: [
                $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:root`,
              ],
            },
          ],
          actions: ["sts:AssumeRole"],
          conditions: [
            {
              test: "StringEquals",
              variable: "sts:ExternalId",
              values: [realtimeSubscriberRoleExternalId.result],
            },
          ],
        },
      ],
    }).json,
    inlinePolicies: [
      {
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
      },
    ],
  },
);

export const realtimePublisherRoleExternalId = new random.RandomPassword(
  "RealtimePublisherRoleExternalId",
  {
    length: 32,
    special: true,
  },
);

export const realtimePublisherRole = new aws.iam.Role("RealtimePublisherRole", {
  assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        principals: [
          {
            type: "AWS",
            identifiers: [
              $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:root`,
            ],
          },
        ],
        actions: ["sts:AssumeRole"],
        conditions: [
          {
            test: "StringEquals",
            variable: "sts:ExternalId",
            values: [realtimePublisherRoleExternalId.result],
          },
        ],
      },
    ],
  }).json,
  inlinePolicies: [
    {
      policy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            actions: ["appsync:EventPublish"],
            resources: [$interpolate`${appsyncEventApi.apiArn}/*`],
          },
        ],
      }).json,
    },
  ],
});

export const tenantApiFunctionRole = new aws.iam.Role("TenantApiFunctionRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
  managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
});

export const tenantRoles = new sst.Linkable("TenantRoles", {
  properties: {
    apiAccess: {
      nameTemplate: buildNameTemplate("ApiAccessRole"),
    },
    bucketsAccess: {
      nameTemplate: buildNameTemplate("BucketsAccessRole"),
    },
    invoicesSender: {
      nameTemplate: buildNameTemplate("InvoicesSenderRole"),
    },
    invoicesReceiver: {
      nameTemplate: buildNameTemplate("InvoicesReceiverRole"),
    },
    realtimePublisher: {
      nameTemplate: buildNameTemplate("RealtimePublisherRole"),
    },
    realtimeSubscriber: {
      nameTemplate: buildNameTemplate("RealtimeSubscriberRole"),
    },
  },
});
