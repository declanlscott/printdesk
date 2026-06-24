// Non-effect reference implementation: https://github.com/Benjscho/drizzle-orm/blob/f1f5a604a4678ea277f741a6ed6ffc8e218d6c94/drizzle-orm/src/aws-dsql/migrator.ts#L108

import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm/sql";
import * as Array from "effect/Array";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Tuple from "effect/Tuple";

import { Drizzle } from "./drizzle";

import type { MigrationConfig } from "drizzle-orm/migrator";

const defaultSchema = "drizzle";
const defaultTable = "__drizzle_migrations";

export const columns = {
  id: sql.identifier("id"),
  migrationHash: sql.identifier("migration_hash"),
  migrationFolderMillis: sql.identifier("migration_folder_millis"),
  statementIndex: sql.identifier("statement_index"),
  statementHash: sql.identifier("statement_hash"),
  createdAt: sql.identifier("created_at"),
};

export const MigratorConfig = Context.Reference<MigrationConfig>(
  "@printdesk/core/database/MigratorConfig",
  { defaultValue: () => ({ migrationsFolder: "migrations" }) },
);

export class ReadMigrationsError extends Schema.TaggedErrorClass<ReadMigrationsError>()(
  "ReadMigrationsError",
  { cause: Schema.Defect() },
) {}

export const DsqlStatement = Schema.Trim.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transform((statement) => {
      const createIndexRegex = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?!ASYNC\s+)/i;

      if (createIndexRegex.test(statement))
        return statement.replace(createIndexRegex, (_, unique?: string) =>
          unique ? "CREATE UNIQUE INDEX ASYNC " : "CREATE INDEX ASYNC",
        );

      return statement;
    }),
    encode: SchemaGetter.forbidden(() => "Not implemented"),
  }),
);

export class Migrator extends Context.Service<Migrator>()("@printdesk/core/database/migrator", {
  make: Effect.gen(function* () {
    const db = yield* Drizzle;
    const config = yield* MigratorConfig;
    const crypto = yield* Crypto.Crypto;

    const schema = sql.identifier(config.migrationsSchema ?? defaultSchema);
    const table = sql.identifier(config.migrationsTable ?? defaultTable);

    const migrate = Effect.gen(function* () {
      const migrations = yield* Effect.try({
        try: () => readMigrationFiles(config),
        catch: (cause) => new ReadMigrationsError({ cause }),
      });

      yield* db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${schema}`);

      yield* db.execute(sql`CREATE TABLE IF NOT EXISTS ${schema}.${table} (
  ${columns.id} BIGINT GENERATED ALWAYS AS IDENTITY (CACHE 1) PRIMARY KEY,
  ${columns.migrationHash} TEXT NOT NULL,
  ${columns.migrationFolderMillis} BIGINT NOT NULL,
  ${columns.statementIndex} INTEGER NOT NULL,
  ${columns.statementHash} TEXT NOT NULL,
  ${columns.createdAt} TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (${columns.migrationHash}, ${columns.statementIndex})
)`);

      const statements = yield* db
        .execute<{ migration_hash: string; statement_index: number; statement_hash: string }>(
          sql`SELECT ${columns.migrationHash}, ${columns.statementIndex}, ${columns.statementHash}
  FROM ${schema}.${table}
  ORDER BY ${columns.migrationFolderMillis}, ${columns.statementIndex}`,
        )
        .pipe(
          Effect.map(
            Array.map((migration) =>
              Tuple.make(
                `${migration.migration_hash}:${migration.statement_index}` as const,
                migration.statement_hash,
              ),
            ),
          ),
          Effect.map(HashMap.fromIterable),
        );

      yield* Effect.forEach(
        migrations,
        (migration) =>
          Effect.forEach(
            migration.sql,
            Effect.fn(function* (statement, index) {
              const hash = yield* crypto
                .digest("SHA-256", Buffer.from(statement.trim()))
                .pipe(Effect.map((bytes) => Buffer.from(bytes).toString("hex")));

              const storedHash = statements.pipe(HashMap.get(`${migration.hash}:${index}`));

              if (Option.isSome(storedHash)) {
                if (storedHash.value !== hash)
                  yield* Effect.log(
                    `Warning: Migration statement ${index} in migration ${DateTime.makeUnsafe(migration.folderMillis).pipe(DateTime.formatUtc)} has been modified since it was applied.` +
                      `The stored hash (${storedHash.value.slice(0, 8)}) differs from the current hash (${hash.slice(0, 8)}).` +
                      `This statement will be skipped, but the change may indicate a problem.\n` +
                      `Action: If this change is intentional, create a new migration. If not, investigate why this migration file changed.`,
                  );

                return;
              }

              const dsqlStatement = yield* Schema.decodeEffect(DsqlStatement)(statement);
              if (dsqlStatement) yield* db.execute(sql.raw(dsqlStatement));

              yield* db.execute(sql`INSERT INTO ${schema}.${table}
  (${columns.migrationHash}, ${columns.migrationFolderMillis}, ${columns.statementIndex}, ${columns.statementHash})
  VALUES (${migration.hash}, ${migration.folderMillis}, ${index}, ${hash})`);
            }),
            { discard: true },
          ),
        { discard: true },
      );
    });

    return { migrate } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
