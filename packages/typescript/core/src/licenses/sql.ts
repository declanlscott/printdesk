import { sql } from "drizzle-orm";
import { unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { LicensesContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";

export const licenses = new Tables.NonSync(
  "licenses",
  {
    key: Columns.redactedUuid()
      .notNull()
      .default(sql`gen_random_uuid()`),
    status: Columns.union(LicensesContract.statuses).notNull().default("active"),
  },
  (table) => [unique().on(table.tenantId), uniqueIndex().on(table.key)],
);
export const licensesTable = licenses.table;
export type LicensesTable = typeof licensesTable;
export type License = InferSelectModel<LicensesTable>;
