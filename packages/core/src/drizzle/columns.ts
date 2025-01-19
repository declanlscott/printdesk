import { decode, encode } from "@msgpack/msgpack";
import { getTableColumns, sql } from "drizzle-orm";
import { char, customType, timestamp } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { Constants } from "../utils/constants";
import { generateId } from "../utils/shared";

import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

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
      .$onUpdate(() => sql`now()`);
  },
  get deletedAt() {
    return timestamp("deleted_at");
  },
};
export type Timestamp = keyof typeof timestamps;

export function buildConflictUpdateColumns<
  TTable extends PgTable,
  TColumnName extends keyof TTable["_"]["columns"],
>(table: TTable, columnNames: Array<TColumnName>) {
  const tableColumns = getTableColumns(table);

  return columnNames.reduce(
    (updateColumns, column) => {
      const columnName = tableColumns[column].name;

      updateColumns[column] = sql.raw(`excluded.${columnName}`);

      return updateColumns;
    },
    {} as Record<TColumnName, SQL>,
  );
}

export type OmitTimestamps<TTable> = Omit<TTable, keyof typeof timestamps>;

export const getRowVersionColumn = (tableName: string) =>
  sql<number>`"${tableName}"."${Constants.ROW_VERSION_COLUMN_NAME}"`;

export const customJsonb = <
  TMaybeSchema extends v.GenericSchema | undefined = undefined,
  TData = TMaybeSchema extends v.GenericSchema
    ? v.InferOutput<TMaybeSchema>
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
>(
  name: string,
  schema?: TMaybeSchema,
) =>
  customType<{ data: TData; driverData: Buffer }>({
    dataType: () => "bytea",
    toDriver: (value) => Buffer.from(encode(value)),
    fromDriver(value) {
      const decoded = decode(value);

      if (schema) return v.parse(schema, decoded) as TData;

      return decoded as TData;
    },
  })(name);

export const customEnum = <const TValues extends ReadonlyArray<string>>(
  name: string,
  values: TValues,
) =>
  customType<{ data: TValues[number]; driverData: string }>({
    dataType: () => "varchar(50)",
    toDriver: (value) => value,
    fromDriver: (value) => v.parse(v.picklist(values), value),
  })(name);

export const customEnumArray = <const TValues extends ReadonlyArray<string>>(
  name: string,
  values: TValues,
) =>
  customType<{
    data: Array<TValues[number]>;
    driverData: string;
  }>({
    dataType: () => "text",
    toDriver: (value) => value.join(","),
    fromDriver: (value) =>
      v.parse(v.array(v.picklist(values)), value.split(",")),
  })(name);
