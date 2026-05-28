import { eq } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { TenantsContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";

export const tenants = new Tables.Sync(
  "tenants",
  {
    subdomain: Columns.varchar().$type<TenantsContract.Subdomain>().notNull(),
    name: Columns.varchar().notNull(),
    status: Columns.union(TenantsContract.statuses).notNull().default("setup"),
    lastPapercutSyncAt: Columns.dateTime(),
  },
  (table) => [check("tenant_id", eq(table.id, table.tenantId))],
);
export const tenantsTable = tenants.table;
export type TenantsTable = typeof tenantsTable;
export type Tenant = InferSelectModel<TenantsTable>;
