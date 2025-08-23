import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import {
  datetime,
  id,
  jsonb,
  pgEnum,
  primaryId,
  timestamps,
  version,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  LicensesContract,
  TenantMetadataContract,
  TenantsContract,
} from "./contracts";

import type { TableContract } from "../database2/contract";

export const licensesTable = pgTable(LicensesContract.tableName, {
  key: uuid("key").defaultRandom().primaryKey(),
  tenantId: id("tenant_id").unique(),
  status: pgEnum("status", LicensesContract.statuses)
    .notNull()
    .default("active"),
});
export type LicensesTable = typeof licensesTable;
export type License = TableContract.Infer<LicensesTable>;

export const tenantsTable = pgTable(
  TenantsContract.tableName,
  {
    id: primaryId.$type<TableContract.TenantId>(),
    subdomain: varchar("subdomain", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: pgEnum("status", TenantsContract.statuses)
      .notNull()
      .default("setup"),
    ...timestamps,
    ...version,
  },
  (table) => [uniqueIndex().on(table.subdomain)],
);
export type TenantsTable = typeof tenantsTable;
export type Tenant = TableContract.Infer<TenantsTable>;

export const tenantMetadataTable = pgTable(TenantMetadataContract.tableName, {
  tenantId: id("tenant_id").primaryKey(),
  infraProgramInput: jsonb(
    "infra_program_input",
    TenantMetadataContract.InfraProgramInput,
  ).notNull(),
  apiKey: varchar("api_key"),
  lastPapercutSyncAt: datetime("last_papercut_sync_at"),
  ...timestamps,
});
export type TenantMetadataTable = typeof tenantMetadataTable;
export type TenantMetadata = TableContract.Infer<TenantMetadataTable>;
