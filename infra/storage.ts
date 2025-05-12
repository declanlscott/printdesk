import { Constants } from "@printdesk/core/utils/constants";

import { pulumiRole } from "./iam";
import { isProdStage } from "./misc";

export const codeBucket = new sst.aws.Bucket("CodeBucket", {
  versioning: true,
  transform: {
    policy: (args) => {
      args.policy = sst.aws.iamEdit(args.policy, (policy) => {
        policy.Statement.push({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
          Principal: { AWS: pulumiRole.arn },
        });
      });
    },
  },
});

export const pulumiBucket = new sst.aws.Bucket("PulumiBucket");

export const infraDeadLetterQueue = new sst.aws.Queue(
  "InfraDeadLetterQueue",
  {
    transform: {
      queue: {
        messageRetentionSeconds: 1209600, // 14 days
      },
    },
  },
  { retainOnDelete: isProdStage },
);

export const infraQueue = new sst.aws.Queue(
  "InfraQueue",
  {
    dlq: infraDeadLetterQueue.arn,
    visibilityTimeout: "15 minutes",
  },
  { retainOnDelete: isProdStage },
);

export const tenantParameters = new sst.Linkable("TenantParameters", {
  properties: {
    documentsMimeTypes: {
      nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/app/settings/documents/mime-types`,
    },
    documentsSizeLimit: {
      nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/app/settings/documents/size-limit`,
    },
    tailnetPapercutServerUri: {
      nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/papercut/server/tailnet-uri`,
    },
    papercutServerAuthToken: {
      nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/papercut/server/auth-token`,
    },
    tailscaleOauthClient: {
      nameTemplate: `/${$app.name}/${$app.stage}/tenant/${Constants.TENANT_ID_PLACEHOLDER}/tailscale/oauth-client`,
    },
  },
});
