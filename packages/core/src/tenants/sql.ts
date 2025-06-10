import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  customEnum,
  customJsonb,
  id,
  idPrimaryKey,
  timestamps,
  version,
} from "../database/columns";
import { Constants } from "../utils/constants";
import {
  infraProgramInputSchema,
  licensesTableName,
  licenseStatuses,
  tenantMetadataTableName,
  tenantsTableName,
  tenantStatuses,
} from "./shared";

import type { InferFromTable } from "../database/tables";

export const licenseStatus = (name: string) =>
  customEnum(name, licenseStatuses);

export const licensesTable = pgTable(licensesTableName, {
  key: uuid("key").defaultRandom().primaryKey(),
  tenantId: id("tenant_id").unique(),
  status: licenseStatus("status").notNull().default("active"),
});
export type LicensesTable = typeof licensesTable;
export type License = InferFromTable<LicensesTable>;

export const tenantStatus = (name: string) => customEnum(name, tenantStatuses);

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
  infraProgramInput: customJsonb(
    "infra_program_input",
    infraProgramInputSchema,
  ).notNull(),
  apiKey: varchar("api_key"),
  lastPapercutSyncAt: timestamp("last_papercut_sync_at"),
  ...timestamps,
});
export type TenantMetadataTable = typeof tenantMetadataTable;
export type TenantMetadata = InferFromTable<TenantMetadataTable>;
