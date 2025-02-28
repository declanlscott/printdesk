import { pgTable, primaryKey } from "drizzle-orm/pg-core";

import { generateId } from "../utils/shared";
import { id, timestamps, version } from "./columns";

import type { BuildColumns, BuildExtraConfigColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfigValue,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";

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
 * Wrapper for tenant owned tables with timestamps and default ID
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
