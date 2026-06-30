import { eq } from "drizzle-orm";
import { check, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import { TenantsContract } from "./contract";

import type { InferSelectModel } from "drizzle-orm";

export const tenants = new Tables.Sync(
  "tenants",
  {
    slug: Columns.varchar().$type<TenantsContract.Slug>().notNull(),
    name: Columns.varchar().notNull(),
    status: Columns.union(TenantsContract.Status.literals).notNull().default("setup"),
    lastPapercutSyncAt: Columns.dateTime(),
    licenseKey: Columns.redactedUuid().notNull(),
  },
  (table) => [
    check("tenant_id", eq(table.id, table.tenantId)),
    uniqueIndex().on(table.slug),
    uniqueIndex().on(table.licenseKey),
  ],
);
export const tenantsTable = tenants.table;
export type TenantsTable = typeof tenantsTable;
export type Tenant = InferSelectModel<TenantsTable>;
