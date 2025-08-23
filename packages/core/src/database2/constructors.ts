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
import { TableContract } from "./contract";

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
export function id<TType>(name: string) {
  return char(name, { length: Constants.NANOID_LENGTH }).$type<TType>();
}

/**
 * Primary key nanoID column
 */
export const primaryId = id("id").$default(generateId).primaryKey();

/**
 * Tenant ID column
 */
export const tenantId = id<TableContract.TenantId>("tenant_id").notNull();

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
      .$type<TableContract.Version>()
      .notNull()
      .default(TableContract.Version.make(1))
      .$onUpdateFn(() => sql`version + 1`);
  },
};

/**
 * IDs for tenant owned tables (used as composite primary key)
 */
export const tenantColumns = {
  get id() {
    return id<TableContract.EntityId>("id").$defaultFn(generateId).notNull();
  },
  get tenantId() {
    return tenantId;
  },
};

export type DefaultTenantColumns = typeof tenantColumns &
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
      TColumnsMap & DefaultTenantColumns,
      "pg"
    >,
  ) => Array<PgTableExtraConfigValue>,
): PgTableWithColumns<{
  name: TTableName;
  schema: undefined;
  columns: BuildColumns<TTableName, TColumnsMap & DefaultTenantColumns, "pg">;
  dialect: "pg";
}> =>
  pgTable(
    name,
    { ...tenantColumns, ...timestamps, ...version, ...columns },
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
