import { getTableColumns, getTableName, sql } from "drizzle-orm";
import { pgTable, primaryKey } from "drizzle-orm/pg-core";
import * as Array from "effect/Array";
import * as Match from "effect/Match";
import * as Record from "effect/Record";

import { Columns } from "../columns";

import type { BuildColumns, BuildExtraConfigColumns, SQL } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfigValue,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";

export namespace Tables {
  export class Table<
    TName extends string,
    TColumns extends Record<string, PgColumnBuilderBase>,
  > {
    readonly definition: PgTableWithColumns<{
      name: TName;
      schema: undefined;
      columns: BuildColumns<TName, TColumns, "pg">;
      dialect: "pg";
    }>;

    constructor(
      name: TName,
      columns: TColumns,
      extraConfig?: (
        self: BuildExtraConfigColumns<TName, TColumns, "pg">,
      ) => Array<PgTableExtraConfigValue>,
    ) {
      this.definition = pgTable(
        name,
        columns,
        (table) => extraConfig?.(table) ?? [],
      );
    }

    get name() {
      return getTableName(this.definition);
    }

    get conflictSet() {
      return Array.reduce(
        Record.values(getTableColumns(this.definition)),
        Record.empty<string, SQL>(),
        (set, { name }) => {
          set[name] = sql.raw(
            `COALESCE(EXCLUDED."${name}", "${this.name}"."${name}")`,
          );

          return set;
        },
      );
    }
  }

  /**
   * Wrapper for tenant-owned tables with ids, timestamps, and sync version columns.
   */
  export class Sync<
    TName extends string,
    TColumns extends Record<string, PgColumnBuilderBase>,
  > {
    readonly definition: PgTableWithColumns<{
      name: TName;
      schema: undefined;
      columns: BuildColumns<TName, Columns.Sync & TColumns, "pg">;
      dialect: "pg";
    }>;

    constructor(
      name: TName,
      columns: TColumns,
      extraConfig?: (
        self: BuildExtraConfigColumns<TName, Columns.Sync & TColumns, "pg">,
      ) => Array<PgTableExtraConfigValue>,
    ) {
      this.definition = pgTable(
        name,
        {
          ...Columns.tenant,
          ...Columns.timestamps,
          ...Columns.syncVersion,
          ...columns,
        },
        (table) => [
          primaryKey({ columns: [table.id, table.tenantId] }),
          ...(extraConfig?.(table) ?? []),
        ],
      );
    }

    get name() {
      return getTableName(this.definition);
    }

    get conflictSet() {
      return Array.reduce(
        Record.values(getTableColumns(this.definition)),
        Record.empty<string, SQL>(),
        (set, { name }) =>
          Record.set(
            name,
            sql.raw(
              Match.value(name).pipe(
                Match.when(
                  "updated_at",
                  (name) => `COALESCE(EXCLUDED."${name}", NOW())`,
                ),
                Match.when("version", (name) => `"${this.name}"."${name}" + 1`),
                Match.orElse(
                  (name) =>
                    `COALESCE(EXCLUDED."${name}", "${this.name}"."${name}")`,
                ),
              ),
            ),
          )(set),
      );
    }
  }

  export class NonSync<
    TName extends string,
    TColumns extends Record<string, PgColumnBuilderBase>,
  > {
    readonly definition: PgTableWithColumns<{
      name: TName;
      schema: undefined;
      columns: BuildColumns<TName, Columns.NonSync & TColumns, "pg">;
      dialect: "pg";
    }>;

    constructor(
      name: TName,
      columns: TColumns,
      extraConfig?: (
        self: BuildExtraConfigColumns<TName, Columns.NonSync & TColumns, "pg">,
      ) => Array<PgTableExtraConfigValue>,
    ) {
      this.definition = pgTable(
        name,
        { ...Columns.tenant, ...Columns.timestamps, ...columns },
        (table) => [
          primaryKey({ columns: [table.id, table.tenantId] }),
          ...(extraConfig?.(table) ?? []),
        ],
      );
    }

    get name() {
      return getTableName(this.definition);
    }

    get conflictSet() {
      return Array.reduce(
        Record.values(getTableColumns(this.definition)),
        Record.empty<string, SQL>(),
        (set, { name }) => {
          set[name] = sql.raw(
            Match.value(name).pipe(
              Match.when(
                "updated_at",
                (name) => `COALESCE(EXCLUDED."${name}", NOW())`,
              ),
              Match.orElse(
                (name) =>
                  `COALESCE(EXCLUDED."${name}", "${this.name}"."${name}")`,
              ),
            ),
          );

          return set;
        },
      );
    }
  }
}
