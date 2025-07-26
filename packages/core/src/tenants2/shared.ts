import { Schema, Struct } from "effect";

import { NonSyncTable, SyncTable, Timestamps } from "../database2/shared";
import { SyncMutation } from "../sync2/shared";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

import type { LicensesTable, TenantMetadataTable, TenantsTable } from "./sql";

export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];
export const LicenseKey = Schema.UUID;
export const licensesTableName = "licenses";
export const licensesTable = NonSyncTable<LicensesTable>()(
  licensesTableName,
  Schema.Struct({
    key: LicenseKey,
    tenantId: NanoId,
    status: Schema.Literal(...licenseStatuses),
  }),
  [],
);

export const tenantStatuses = ["setup", "active", "suspended"] as const;
export type TenantStatus = (typeof tenantStatuses)[number];
export const TenantSubdomain = Schema.String.pipe(
  Schema.pattern(Constants.TENANT_SUBDOMAIN_REGEX),
);
export const tenantsTableName = "tenants";
export const tenantsTable = SyncTable<TenantsTable>()(
  tenantsTableName,
  Schema.Struct({
    id: NanoId,
    subdomain: TenantSubdomain,
    name: Schema.String,
    status: Schema.Literal(...tenantStatuses),
    ...Timestamps.fields,
  }),
  ["read", "update"],
);
export const updateTenant = SyncMutation(
  "updateTenant",
  Schema.extend(
    tenantsTable.Schema.pick("id", "updatedAt"),
    tenantsTable.Schema.omit("id", ...Struct.keys(Timestamps.fields)).pipe(
      Schema.partial,
    ),
  ),
);

export const Timezone = Schema.Literal(...Intl.supportedValuesOf("timeZone"));
export const InfraProgramInput = Schema.Struct({
  papercutSyncCronExpression: Schema.String,
  timezone: Timezone,
});
export const tenantMetadataTableName = "tenant_metadata";
export const tenantMetadataTable = NonSyncTable<TenantMetadataTable>()(
  tenantMetadataTableName,
  Schema.Struct({
    tenantId: NanoId,
    infraProgramInput: InfraProgramInput,
    apiKey: Schema.NullOr(Schema.String),
    lastPapercutSyncAt: Schema.NullOr(Schema.Date),
    ...Timestamps.fields,
  }),
  [],
);
