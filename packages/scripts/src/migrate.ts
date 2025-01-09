import { join } from "path";

import { db } from "@printworks/core/drizzle";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as R from "remeda";

import type { MigrationConfig } from "drizzle-orm/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgSession } from "drizzle-orm/pg-core";

async function migrate<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  config: MigrationConfig,
) {
  const migrations = readMigrationFiles(config);

  // @ts-expect-error - session is not typed
  const session: PgSession = db.session;

  const schema = sql.identifier("drizzle");
  const table = sql.identifier("__drizzle_migrations");
  const idColumn = sql.identifier("id");
  const hashColumn = sql.identifier("hash");
  const createdAtColumn = sql.identifier("created_at");

  const createSchema = sql`
    CREATE SCHEMA IF NOT EXISTS ${schema}
  `;

  const createTable = sql`
    CREATE TABLE IF NOT EXISTS ${schema}.${table} (
      ${idColumn} SMALLINT PRIMARY KEY,
      ${hashColumn} TEXT NOT NULL,
      ${createdAtColumn} BIGINT NOT NULL
    )
  `;

  await session.execute(createSchema);
  await session.execute(createTable);

  const lastMigration = await session
    .all<{
      id: number;
      hash: string;
      created_at: string;
    }>(
      sql`
        SELECT ${idColumn}, ${hashColumn}, ${createdAtColumn} FROM ${schema}.${table}
          ORDER BY ${createdAtColumn} DESC LIMIT 1
      `,
    )
    .then(R.first());

  for (const migration of migrations) {
    if (
      !lastMigration ||
      Number(lastMigration.created_at) < migration.folderMillis
    ) {
      for (const statement of migration.sql)
        await session.execute(sql.raw(statement.replace(" USING btree ", " ")));

      await session.execute(
        sql`
          INSERT INTO ${schema}.${table}
            (${idColumn}, ${hashColumn}, ${createdAtColumn}) 
            values(${(lastMigration?.id ?? 0) + 1}, ${migration.hash}, ${migration.folderMillis})
        `,
      );
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
