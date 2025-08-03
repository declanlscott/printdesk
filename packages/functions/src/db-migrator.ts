import { LambdaHandler } from "@effect-aws/lambda";
import * as Logger from "@effect-aws/powertools-logger";
import { Database } from "@printdesk/core/database2";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect, Layer } from "effect";

import type { MigrationConfig } from "drizzle-orm/migrator";
import type { PgSession } from "drizzle-orm/pg-core";

const drizzleSchema = sql.identifier("drizzle");

const drizzleMigrationsTable = {
  name: sql.identifier("__drizzle_migrations"),
  columns: {
    id: sql.identifier("id"),
    hash: sql.identifier("hash"),
    createdAt: sql.identifier("created_at"),
  },
} as const;

type DrizzleMigration = {
  id: number;
  hash: string;
  created_at: string;
};

const LambdaLayer = Layer.mergeAll(
  Layer.effectDiscard(Database.Database.setupPoolListeners).pipe(
    Layer.provideMerge(Database.Database.Default),
  ),
  Logger.defaultLayer,
);

export const handler = LambdaHandler.make({
  layer: LambdaLayer,
  handler: () =>
    Logger.logInfo("Running database migrations ...").pipe(
      Effect.andThen(() =>
        Effect.orElseSucceed(
          migrate({ migrationsFolder: "migrations" }).pipe(
            Effect.tapBoth({
              onSuccess: () => Logger.logInfo("✅ Migration completed!"),
              onFailure: (e) =>
                Logger.logError(`❌ Error during migration: ${e.toString()}`),
            }),
            Effect.andThen({ success: true }),
          ),
          () => ({ success: false }),
        ),
      ),
    ),
});

const migrate = (config: MigrationConfig) =>
  Effect.gen(function* () {
    const db = yield* Database.Database;

    // @ts-expect-error - session is not typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const session: PgSession = db.client.session;

    yield* Effect.tryPromise(async () => {
      const migrations = readMigrationFiles(config);

      await session.execute(sql`
          CREATE SCHEMA IF NOT EXISTS ${drizzleSchema}
        `);

      await session.execute(sql`
        CREATE TABLE IF NOT EXISTS ${drizzleSchema}.${drizzleMigrationsTable.name} (
          ${drizzleMigrationsTable.columns.id} SMALLINT PRIMARY KEY,
          ${drizzleMigrationsTable.columns.hash} TEXT NOT NULL,
          ${drizzleMigrationsTable.columns.createdAt} BIGINT NOT NULL
        )
      `);

      let lastMigration = await session
        .all<DrizzleMigration>(
          sql`
            SELECT
              ${drizzleMigrationsTable.columns.id},
              ${drizzleMigrationsTable.columns.hash},
              ${drizzleMigrationsTable.columns.createdAt}
            FROM ${drizzleSchema}.${drizzleMigrationsTable.name}
            ORDER BY ${drizzleMigrationsTable.columns.createdAt} DESC LIMIT 1
          `,
        )
        .then((all) => all.at(0));

      const isFirstRun = !lastMigration;

      for (const migration of migrations) {
        if (
          isFirstRun ||
          !lastMigration ||
          Number(lastMigration.created_at) < migration.folderMillis
        ) {
          for (const statement of migration.sql)
            await session.execute(sql.raw(statement)).then(console.log);

          lastMigration = await session
            .all<{ row: string }>(
              sql`
                INSERT INTO ${drizzleSchema}.${drizzleMigrationsTable.name} (
                  ${drizzleMigrationsTable.columns.id},
                  ${drizzleMigrationsTable.columns.hash},
                  ${drizzleMigrationsTable.columns.createdAt}
                )
                VALUES(${(lastMigration?.id ?? 0) + 1}, ${migration.hash}, ${migration.folderMillis})
                RETURNING (
                  ${drizzleMigrationsTable.columns.id},
                  ${drizzleMigrationsTable.columns.hash},
                  ${drizzleMigrationsTable.columns.createdAt}
                )
              `,
            )
            .then((all) => {
              const returned = all.at(0);
              if (!returned)
                throw new Error(
                  "Failed to insert drizzle migration, nothing returned.",
                );

              const [id, hash, createdAt] = returned.row
                .slice(1, -1)
                .split(",");

              return {
                id: Number(id),
                hash,
                created_at: createdAt,
              } satisfies DrizzleMigration;
            });
        }
      }
    });
  });
