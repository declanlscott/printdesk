import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  customEnum,
  customJsonb,
  id,
  idPrimaryKey,
  NonSyncTable,
  SyncTable,
  timestamps,
  version,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  licensesTableName,
  licenseStatuses,
  tenantMetadataTableName,
  tenantsTableName,
  tenantStatuses,
} from "./shared";

import type { InferFromTable } from "../database2/constructors";

const licenseStatus = (name: string) => customEnum(name, licenseStatuses);

export const licensesTable = NonSyncTable(
  pgTable(licensesTableName, {
    key: uuid("key").defaultRandom().primaryKey(),
    tenantId: id("tenant_id").unique(),
    status: licenseStatus("status").notNull().default("active"),
  }),
  [],
);
export type LicensesTable = (typeof licensesTable)["table"];
export type License = InferFromTable<LicensesTable>;

const tenantStatus = (name: string) => customEnum(name, tenantStatuses);

export const tenantsTable = SyncTable(
  pgTable(
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
  ),
  ["read"],
);
export type TenantsTable = (typeof tenantsTable)["table"];
export type Tenant = InferFromTable<TenantsTable>;

export const tenantMetadataTable = NonSyncTable(
  pgTable(tenantMetadataTableName, {
    tenantId: id("tenant_id").primaryKey(),
    infraProgramInput: customJsonb(
      "infra_program_input",
      // TODO: Infra program input schema
      Schema.Struct({}),
    ).notNull(),
    apiKey: varchar("api_key"),
    lastPapercutSyncAt: timestamp("last_papercut_sync_at"),
    ...timestamps,
  }),
  [],
);
export type TenantMetadataTable = (typeof tenantMetadataTable)["table"];
export type TenantMetadata = InferFromTable<TenantMetadataTable>;
