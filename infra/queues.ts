import { isProdStage } from "./misc";

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
