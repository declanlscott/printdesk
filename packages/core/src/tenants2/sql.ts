import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import {
  datetime,
  id,
  idPrimaryKey,
  jsonb,
  pgEnum,
  timestamps,
  version,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  InfraProgramInput,
  licensesTableName,
  licenseStatuses,
  tenantMetadataTableName,
  tenantsTableName,
  tenantStatuses,
} from "./shared";

import type { InferFromTable } from "../database2/shared";

export const licensesTable = pgTable(licensesTableName, {
  key: uuid("key").defaultRandom().primaryKey(),
  tenantId: id("tenant_id").unique(),
  status: pgEnum("status", licenseStatuses).notNull().default("active"),
});
export type LicensesTable = typeof licensesTable;
export type License = InferFromTable<LicensesTable>;

const tenantStatus = (name: string) => pgEnum(name, tenantStatuses);

export const tenantsTable = pgTable(
  tenantsTableName,
  {
    ...idPrimaryKey,
    subdomain: varchar("subdomain", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: tenantStatus("status").notNull().default("setup"),
    ...timestamps,
    ...version,
  },
  (table) => [uniqueIndex().on(table.subdomain)],
);
export type TenantsTable = typeof tenantsTable;
export type Tenant = InferFromTable<TenantsTable>;

export const tenantMetadataTable = pgTable(tenantMetadataTableName, {
  tenantId: id("tenant_id").primaryKey(),
  infraProgramInput: jsonb("infra_program_input", InfraProgramInput).notNull(),
  apiKey: varchar("api_key"),
  lastPapercutSyncAt: datetime("last_papercut_sync_at"),
  ...timestamps,
});
export type TenantMetadataTable = typeof tenantMetadataTable;
export type TenantMetadata = InferFromTable<TenantMetadataTable>;
