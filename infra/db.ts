import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Constants } from "@printworks/core/utils/constants";
import * as v from "valibot";

import * as custom from "./custom";
import { aws_ } from "./misc";
import { calculateHash, normalizePath } from "./utils";

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
        new DsqlSigner({
          hostname,
          region,
          expiresIn: 43200, // 12 hours
        }).getDbConnectAdminAuthToken(),
    ),
  },
});

export const userActivityTable = new sst.aws.Dynamo("UserActivityTable", {
  fields: {
    [Constants.PK]: "string",
    [Constants.SK]: "string",
    [Constants.GSI.ONE.PK]: "string",
    [Constants.GSI.ONE.SK]: "string",
  },
  primaryIndex: { hashKey: Constants.PK, rangeKey: Constants.SK },
  globalIndexes: {
    gsi1: { hashKey: Constants.GSI.ONE.PK, rangeKey: Constants.GSI.ONE.SK },
  },
  stream: "new-image",
});

userActivityTable.subscribe(
  "IncrementMonthlyActiveUsers",
  "packages/functions/node/src/increment-mau.handler",
  {
    filters: [
      {
        eventName: ["INSERT"],
        dynamodb: {
          NewImage: {
            [Constants.GSI.ONE.PK]: {
              S: [{ prefix: Constants.MONTH + Constants.TOKEN_DELIMITER }],
            },
            [Constants.GSI.ONE.SK]: {
              S: [{ prefix: Constants.USER + Constants.TOKEN_DELIMITER }],
            },
          },
        },
      },
    ],
  },
);

export const outputs = {
  dsql: dsqlCluster.endpoint,
  userActivityTable: userActivityTable.name,
};
