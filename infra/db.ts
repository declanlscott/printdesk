import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { calculateHash, normalizePath } from "infra/utils";
import * as v from "valibot";

import * as custom from "./custom";
import { aws_ } from "./misc";

export const dsqlCluster = new custom.aws.Dsql.Cluster(
  "DsqlCluster",
  { deletionProtectionEnabled: $app.stage === "production" },
  { retainOnDelete: $app.stage === "production" },
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

export const dbMigratorInvocationSuccessResult = new custom.Value(
  "DbMigratorInvocationSuccessResult",
  {
    value: dbMigratorInvocation.result.apply(
      (result) =>
        v.parse(
          v.object(
            { success: v.literal(true, "Database migration failed") },
            "Invalid database migration result",
          ),
          JSON.parse(result),
        ).success,
    ),
  },
);

export const dbGarbageCollection = new sst.aws.Cron(
  "DbGarbageCollection",
  {
    job: {
      handler: "packages/functions/node/src/db-garbage-collection.handler",
      timeout: "10 seconds",
      link: [aws_, dsqlCluster],
      architecture: "arm64",
      runtime: "nodejs22.x",
    },
    schedule: "rate(1 day)",
  },
  { dependsOn: [dbMigratorInvocationSuccessResult] },
);

new sst.x.DevCommand("Studio", {
  link: [dsqlCluster],
  dev: {
    command: "pnpm drizzle:studio",
    directory: "packages/core",
    autostart: true,
  },
  environment: {
    DB_PASSWORD: $resolve([dsqlCluster.endpoint, aws_.properties.region]).apply(
      ([hostname, region]) =>
        new DsqlSigner({ hostname, region }).getDbConnectAdminAuthToken(),
    ),
  },
});

export const outputs = {
  db: dsqlCluster.endpoint,
};
