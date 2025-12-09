import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import * as lib from "./lib/components";
import { aws_, isProdStage } from "./misc";
import { calculateHash, normalizePath } from "./utils";

export const dsqlCluster = new lib.aws.dsql.Cluster(
  "DsqlCluster",
  {
    tags: {
      "sst:app": $app.name,
      "sst:stage": $app.stage,
    },
    deletionProtectionEnabled: isProdStage,
  },
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
  Schema.decodeSync(
    Schema.transform(
      Schema.parseJson(
        Schema.Struct({
          success: Schema.Literal(true).annotations({
            message: () => "Database migration failed",
          }),
        }).annotations({ message: () => "Invalid database migration result" }),
      ),
      Schema.Literal(true),
      {
        strict: true,
        decode: Struct.get("success"),
        encode: (success) => ({ success }),
      },
    ),
  ),
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
});

export const authTable = new sst.aws.Dynamo("AuthTable", {
  fields: { pk: "string", sk: "string" },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  ttl: "expiry",
});

export const outputs = {
  dsql: dsqlCluster.endpoint,
};
