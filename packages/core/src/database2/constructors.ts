import { decode, encode } from "@msgpack/msgpack";
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import {
  char,
  customType,
  integer,
  pgTable,
  primaryKey,
} from "drizzle-orm/pg-core";
import { DateTime, ParseResult, Schema } from "effect";

import { Constants } from "../utils/constants";
import { generateId } from "../utils/shared";

import type { BuildColumns, BuildExtraConfigColumns, SQL } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTable,
  PgTableExtraConfigValue,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";

export const datetime = customType<{
  driverData: typeof Schema.DateTimeUtc.Encoded;
  data: typeof Schema.DateTimeUtc.Type;
}>({
  dataType: () => "timestamp",
  fromDriver: Schema.decodeSync(Schema.DateTimeUtc),
  toDriver: Schema.encodeSync(Schema.DateTimeUtc),
});

export function jsonb<TSchema extends Schema.Schema.AnyNoContext>(
  name: string,
  schema: TSchema,
) {
  const Jsonb = Schema.transformOrFail(Schema.Uint8Array, schema, {
    decode: (input, _, ast) =>
      ParseResult.try({
        try: (): TSchema["Encoded"] => decode(input),
        catch: (error) =>
          new ParseResult.Type(
            ast,
            input,
            error instanceof Error
              ? error.message
              : "Failed to decode MessagePack",
          ),
      }),
    encode: (input, _, ast) =>
      ParseResult.try({
        try: () => encode(input),
        catch: (error) =>
          new ParseResult.Type(
            ast,
            input,
            error instanceof Error
              ? error.message
              : "Failed to encode MessagePack",
          ),
      }),
    strict: true,
  });

  return customType<{
    driverData: typeof Jsonb.Encoded;
    data: typeof Jsonb.Type;
  }>({
    dataType: () => "bytea",
    // @ts-expect-error TypeScript doesn't know that `Context<TSchema>` is `never`.
    fromDriver: Schema.decodeSync(Jsonb),
    // @ts-expect-error TypeScript doesn't know that `Context<TSchema>` is `never`.
    toDriver: Schema.encodeSync(Jsonb),
  })(name);
}

export function pgEnum<const TValues extends ReadonlyArray<string>>(
  name: string,
  values: TValues,
) {
  const Enum = Schema.Literal(...values);

  return customType<{
    driverData: typeof Enum.Encoded;
    data: typeof Enum.Type;
  }>({
    dataType: () => "varchar(50)",
    fromDriver: Schema.decodeSync(Enum),
    toDriver: Schema.encodeSync(Enum),
  })(name);
}

/**
 * NanoID column
 */
export function id(name: string) {
  return char(name, { length: Constants.NANOID_LENGTH });
}

/**
 * Primary key nanoID column
 */
export const idPrimaryKey = {
  get id() {
    return id("id").$default(generateId).primaryKey();
  },
};

/**
 * Timestamps columns
 */
export const timestamps = {
  get createdAt() {
    return datetime("created_at")
      .notNull()
      .default(sql`now()`);
  },
  get updatedAt() {
    return datetime("updated_at")
      .notNull()
      .default(sql`now()`)
      .$onUpdateFn(DateTime.unsafeNow);
  },
  get deletedAt() {
    return datetime("deleted_at");
  },
};
export type Timestamp = keyof typeof timestamps;

/**
 * Version column
 */
export const version = {
  get version() {
    return integer("version")
      .notNull()
      .default(1)
      .$onUpdateFn(() => sql`version + 1`);
  },
};

/**
 * IDs for tenant owned tables (used as composite primary key)
 */
export const tenantIdColumns = {
  get id() {
    return id("id").$defaultFn(generateId).notNull();
  },
  get tenantId() {
    return id("tenant_id").notNull();
  },
};

export type DefaultTenantTableColumns = typeof tenantIdColumns &
  typeof timestamps &
  typeof version;

/**
 * Wrapper for tenant owned tables with ids, timestamps, and sync version columns.
 */
export const tenantTable = <
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  name: TTableName,
  columns: TColumnsMap,
  extraConfig?: (
    self: BuildExtraConfigColumns<
      TTableName,
      TColumnsMap & DefaultTenantTableColumns,
      "pg"
    >,
  ) => Array<PgTableExtraConfigValue>,
): PgTableWithColumns<{
  name: TTableName;
  schema: undefined;
  columns: BuildColumns<
    TTableName,
    TColumnsMap & DefaultTenantTableColumns,
    "pg"
  >;
  dialect: "pg";
}> =>
  pgTable(
    name,
    { ...tenantIdColumns, ...timestamps, ...version, ...columns },
    (table) => [
      primaryKey({ columns: [table.id, table.tenantId] }),
      ...(extraConfig?.(table) ?? []),
    ],
  );

export function buildConflictSet<TTable extends PgTable>(table: TTable) {
  const tableName = getTableName(table);

  return Object.values(getTableColumns(table)).reduce(
    (set, column) => {
      let statement: string;
      switch (column.name) {
        case "updated_at": {
          statement = `COALESCE(EXCLUDED."${column.name}", NOW())`;
          break;
        }
        case "version": {
          statement = `"${tableName}"."version" + 1`;
          break;
        }
        default:
          statement = `COALESCE(EXCLUDED."${column.name}", "${tableName}"."${column.name}")`;
      }

      set[column.name] = sql.raw(statement);

      return set;
    },
    {} as Record<string, SQL>,
  );
}
