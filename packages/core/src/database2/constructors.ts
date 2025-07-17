import { decode, encode } from "@msgpack/msgpack";
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import {
  char,
  customType,
  integer,
  pgTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";
import { Array, Data, ParseResult, Schema } from "effect";

import { Constants } from "../utils/constants";
import { generateId } from "../utils/shared";
import { NanoId } from "../utils2/shared";

import type {
  BuildColumns,
  BuildExtraConfigColumns,
  InferSelectModel,
  SQL,
  Table,
} from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTable,
  PgTableExtraConfigValue,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";
import type { PermissionAction } from "../access-control2/shared";

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
    return timestamp("created_at").notNull().defaultNow();
  },
  get updatedAt() {
    return timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date());
  },
  get deletedAt() {
    return timestamp("deleted_at");
  },
};
export type Timestamp = keyof typeof timestamps;

export const Timestamps = Schema.Struct({
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  deletedAt: Schema.NullOr(Schema.Date),
});

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

export type OmitTimestamps<TTable> = Omit<TTable, keyof typeof timestamps>;

export function customJsonb<TSchema extends Schema.Schema.AnyNoContext>(
  name: string,
  schema: TSchema,
) {
  const JsonbSchema = Schema.transformOrFail(Schema.Uint8Array, schema, {
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
    driverData: Schema.Schema.Encoded<typeof JsonbSchema>;
    data: Schema.Schema.Type<typeof JsonbSchema>;
  }>({
    dataType: () => "bytea",
    // @ts-expect-error TypeScript doesn't know that `Context<TSchema>` is `never`.
    fromDriver: Schema.decodeSync(JsonbSchema),
    // @ts-expect-error TypeScript doesn't know that `Context<TSchema>` is `never`.
    toDriver: Schema.encodeSync(JsonbSchema),
  })(name);
}

export function customEnum<const TValues extends ReadonlyArray<string>>(
  name: string,
  values: TValues,
) {
  const EnumSchema = Schema.Literal(...values);

  return customType<{
    data: typeof EnumSchema.Type;
    driverData: typeof EnumSchema.Encoded;
  }>({
    dataType: () => "varchar(50)",
    fromDriver: Schema.decodeSync(EnumSchema),
    toDriver: Schema.encodeSync(EnumSchema),
  })(name);
}

export function customEnumArray<const TValues extends ReadonlyArray<string>>(
  name: string,
  values: TValues,
) {
  const EnumArraySchema = Schema.transform(
    Schema.String,
    Schema.Array(Schema.Literal(...values)),
    {
      decode: (str) => str.split(","),
      encode: (arr) => arr.join(","),
      strict: true,
    },
  );

  return customType<{
    driverData: typeof EnumArraySchema.Encoded;
    data: typeof EnumArraySchema.Type;
  }>({
    dataType: () => "text",
    fromDriver: Schema.decodeSync(EnumArraySchema),
    toDriver: Schema.encodeSync(EnumArraySchema),
  })(name);
}

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

type DefaultTenantTableColumns = typeof tenantIdColumns &
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

export const TenantTable = Schema.Struct({
  id: NanoId,
  tenantId: NanoId,
  ...Timestamps.fields,
});

export type InferTablePermissions<
  TTable extends PgTable,
  TActions extends ReadonlyArray<PermissionAction>,
> = {
  [TIndex in keyof TActions]: TActions[TIndex] extends PermissionAction
    ? `${TTable["_"]["name"]}:${TActions[TIndex]}`
    : never;
}[number];

interface BaseTable<
  TTable extends PgTable,
  TActions extends ReadonlyArray<PermissionAction>,
> {
  readonly table: TTable;
  readonly permissions: Array<InferTablePermissions<TTable, TActions>>;
}

export interface SyncTable<
  TTable extends PgTable,
  TActions extends ReadonlyArray<PermissionAction>,
> extends BaseTable<TTable, TActions> {
  readonly _tag: "@printdesk/core/database/SyncTable";
}
export const SyncTable = <
  TTable extends PgTable,
  TActions extends ReadonlyArray<PermissionAction>,
>(
  table: TTable,
  actions: TActions,
) =>
  Data.tagged<SyncTable<TTable, TActions>>(
    "@printdesk/core/database/SyncTable",
  )({
    table,
    permissions: Array.map(
      actions,
      (action) =>
        `${getTableName(table)}:${action}` as InferTablePermissions<
          TTable,
          TActions
        >,
    ),
  });

export interface NonSyncTable<
  TTable extends PgTable,
  TActions extends ReadonlyArray<PermissionAction>,
> extends BaseTable<TTable, TActions> {
  readonly _tag: "@printdesk/core/database/NonSyncTable";
}
export const NonSyncTable = <
  TTable extends PgTable,
  TActions extends ReadonlyArray<PermissionAction>,
>(
  table: TTable,
  actions: TActions,
) =>
  Data.tagged<NonSyncTable<TTable, TActions>>(
    "@printdesk/core/database/NonSyncTable",
  )({
    table,
    permissions: Array.map(
      actions,
      (action) =>
        `${getTableName(table)}:${action}` as InferTablePermissions<
          TTable,
          TActions
        >,
    ),
  });

export type InferFromTable<TTable extends Table> = Readonly<
  Omit<InferSelectModel<TTable>, "version">
>;
