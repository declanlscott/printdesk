import { pulumiRole } from "./roles";

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

export const temporaryBucket = new sst.aws.Bucket("TemporaryBucket");
export const temporaryBucketLifecycle =
  new aws.s3.BucketLifecycleConfigurationV2("TemporaryBucketLifecycle", {
    bucket: temporaryBucket.name,
    rules: [
      {
        id: "daily",
        status: "Enabled",
        filter: { prefix: "daily/" },
        expiration: { days: 1 },
      },
      {
        id: "weekly",
        status: "Enabled",
        filter: { prefix: "weekly/" },
        expiration: { days: 7 },
      },
      {
        id: "monthly",
        status: "Enabled",
        filter: { prefix: "monthly/" },
        expiration: { days: 30 },
      },
    ],
  });
