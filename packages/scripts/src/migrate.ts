import { join } from "path";

import { db } from "@printworks/core/drizzle";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as R from "remeda";

import type { MigrationConfig } from "drizzle-orm/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
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

async function migrate<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  config: MigrationConfig,
) {
  const migrations = readMigrationFiles(config);

  // @ts-expect-error - session is not typed
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const session: PgSession = db.session;

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
    .then(R.first());

  const isFirstRun = !lastMigration;

  for (const migration of migrations) {
    if (
      isFirstRun ||
      !lastMigration ||
      Number(lastMigration.created_at) < migration.folderMillis
    ) {
      for (const statement of migration.sql)
        await session.execute(sql.raw(statement.replace(" USING btree ", " ")));

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
        .then((result) => {
          const returned = result.at(0);
          if (!returned)
            throw new Error(
              "Failed to insert drizzle migration, nothing returned.",
            );

          const [id, hash, createdAt] = returned.row.slice(1, -1).split(",");

          return {
            id: Number(id),
            hash,
            created_at: createdAt,
          } satisfies DrizzleMigration;
        });
    }
  }
}

async function main() {
  console.log("Performing database migrations ...");

  try {
    await migrate(db, {
      migrationsFolder: join(process.cwd(), "../../migrations"),
    });

    console.log("✅ Migration completed!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error during migration:", e);
    process.exit(1);
  }
}

void main();
