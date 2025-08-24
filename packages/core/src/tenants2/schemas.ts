import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import {
  datetime,
  jsonb,
  pgEnum,
  primaryId,
  tenantId,
  timestamps,
  version,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  LicensesContract,
  TenantMetadataContract,
  TenantsContract,
} from "./contracts";

import type { InferSelectModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace LicensesSchema {
  export const table = pgTable(LicensesContract.tableName, {
    key: uuid("key").defaultRandom().primaryKey(),
    tenantId: tenantId.unique(),
    status: pgEnum("status", LicensesContract.statuses)
      .notNull()
      .default("active"),
  });

  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;
}

export namespace TenantsSchema {
  export const table = pgTable(
    TenantsContract.tableName,
    {
      id: primaryId.$type<TableContract.EntityId>(),
      subdomain: varchar("subdomain", {
        length: Constants.VARCHAR_LENGTH,
      })
        .$type<TenantsContract.Subdomain>()
        .notNull(),
      name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
      status: pgEnum("status", TenantsContract.statuses)
        .notNull()
        .default("setup"),
      ...timestamps,
      ...version,
    },
    (table) => [uniqueIndex().on(table.subdomain)],
  );

  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;
}

export namespace TenantMetadataSchema {
  export const table = pgTable(TenantMetadataContract.tableName, {
    tenantId: tenantId.primaryKey(),
    infraProgramInput: jsonb(
      "infra_program_input",
      TenantMetadataContract.InfraProgramInput,
    ).notNull(),
    apiKey: varchar("api_key"),
    lastPapercutSyncAt: datetime("last_papercut_sync_at"),
    ...timestamps,
  });

  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;
}
