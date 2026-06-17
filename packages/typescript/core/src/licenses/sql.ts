import { sql } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";

import type { InferSelectModel } from "drizzle-orm";

export const licenses = new Tables.Table(
  "licenses",
  {
    key: Columns.redactedUuid()
      .notNull()
      .default(sql`gen_random_uuid()`),
    expiresAt: Columns.dateTime(),
    ...Columns.timestamps,
  },
  (table) => [primaryKey({ columns: [table.key] })],
);
export const licensesTable = licenses.table;
export type LicensesTable = typeof licensesTable;
export type License = InferSelectModel<LicensesTable>;
