import { eq, sql } from "drizzle-orm";
import { check, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { Tables } from "../tables";
import {
  LicensesContract,
  TenantMetadataContract,
  TenantsContract,
} from "./contracts";

import type { InferSelectModel } from "drizzle-orm";

export namespace LicensesSchema {
  export const table = new Tables.NonSync(
    "licenses",
    {
      key: Columns.redactedUuid()
        .notNull()
        .default(sql`gen_random_uuid()`),
      status: Columns.union(LicensesContract.statuses)
        .notNull()
        .default("active"),
    },
    (table) => [unique().on(table.tenantId), uniqueIndex().on(table.key)],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace TenantsSchema {
  export const table = new Tables.Sync(
    "tenants",
    {
      subdomain: Columns.varchar().$type<TenantsContract.Subdomain>().notNull(),
      name: Columns.varchar().notNull(),
      status: Columns.union(TenantsContract.statuses)
        .notNull()
        .default("setup"),
    },
    (table) => [check("tenant_id", eq(table.id, table.tenantId))],
  );

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}

export namespace TenantMetadataSchema {
  export const table = new Tables.Table("tenant_metadata", {
    tenantId: Columns.tenantId.primaryKey(),
    infraProgramInput: Columns.jsonb(
      TenantMetadataContract.InfraProgramInput,
    ).notNull(),
    apiKeyHash: Columns.hash(),
    lastPapercutSyncAt: Columns.datetime(),
    ...Columns.timestamps,
  });

  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;
}
