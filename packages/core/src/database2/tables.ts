import { pgTable, primaryKey } from "drizzle-orm/pg-core";

import { tenantIdColumns, timestamps, version } from "./columns";

import type { BuildColumns, BuildExtraConfigColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfigValue,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";
import type { DefaultTenantTableColumns } from "./columns";

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
