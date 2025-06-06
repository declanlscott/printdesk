import { DsqlSigner } from "@aws-sdk/dsql-signer";
import * as v from "valibot";

import * as custom from "./custom";
import { aws_, isProdStage } from "./misc";
import { calculateHash, normalizePath } from "./utils";

export const dsqlCluster = new custom.aws.Dsql.Cluster(
  "DsqlCluster",
  { deletionProtectionEnabled: isProdStage },
  { retainOnDelete: isProdStage },
);

const migrationsFolderPath = "packages/core/migrations";

export const dbMigrator = new sst.aws.Function("DbMigrator", {
  handler: "packages/functions/node/src/db-migrator.handler",
  link: [aws_, dsqlCluster],
  copyFiles: [{ from: migrationsFolderPath, to: "migrations" }],
});

export const dbMigratorInvocation = new aws.lambda.Invocation(
  "DbMigratorInvocation",
  {
    functionName: dbMigrator.name,
    input: JSON.stringify({}),
    triggers: {
      migrations: calculateHash(normalizePath(migrationsFolderPath)),
    },
  },
);

export const dbMigratorInvocationSuccess = dbMigratorInvocation.result.apply(
  (result) =>
    v.parse(
      v.object(
        { success: v.literal(true, "Database migration failed") },
        "Invalid database migration result",
      ),
      JSON.parse(result),
    ).success,
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
  enabled: dbMigratorInvocationSuccess,
});

new sst.x.DevCommand("Studio", {
  link: [aws_, dsqlCluster],
  dev: {
    command: "pnpm drizzle:studio",
    directory: "packages/core",
    autostart: true,
  },
  environment: {
    DB_PASSWORD: $resolve([
      dsqlCluster.endpoint,
      aws.getRegionOutput().name,
    ]).apply(([hostname, region]) =>
      new DsqlSigner({
        hostname,
        region,
        expiresIn: 43200, // 12 hours
      }).getDbConnectAdminAuthToken(),
    ),
  },
});

export const authTable = new sst.aws.Dynamo("AuthTable", {
  fields: { pk: "string", sk: "string" },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  ttl: "expiry",
});

export const configTable = new sst.aws.Dynamo("ConfigTable", {
  fields: { pk: "string", sk: "string" },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
});

export const outputs = {
  dsql: dsqlCluster.endpoint,
};
