import * as custom from "./custom";
import { aws_ } from "./misc";

export const dsqlCluster = new custom.aws.Dsql.Cluster(
  "DsqlCluster",
  { deletionProtectionEnabled: $app.stage === "production" },
  { retainOnDelete: $app.stage === "production" },
);

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler: "packages/functions/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [aws_, dsqlCluster],
    architecture: "arm64",
    runtime: "nodejs22.x",
  },
  schedule: "rate(1 day)",
});

export const outputs = {
  db: dsqlCluster.endpoint,
};
