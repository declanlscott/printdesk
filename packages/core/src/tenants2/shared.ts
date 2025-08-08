import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { NonSyncTable, SyncTable, Timestamps } from "../database2/shared";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

import type { LicensesTable, TenantMetadataTable, TenantsTable } from "./sql";

export const tenantStatuses = ["setup", "active", "suspended"] as const;
export type TenantStatus = (typeof tenantStatuses)[number];
export const TenantSubdomain = Schema.String.pipe(
  Schema.pattern(Constants.TENANT_SUBDOMAIN_REGEX),
);
export const tenantsTableName = "tenants";
export const tenants = SyncTable<TenantsTable>()(
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
export const isTenantSubdomainAvailable = new DataAccess.Policy({
  name: "isTenantSubdomainAvailable",
  Args: tenants.Schema.pick("subdomain"),
});
export const updateTenant = new DataAccess.Mutation({
  name: "updateTenant",
  Args: Schema.extend(
    tenants.Schema.pick("id", "updatedAt"),
    tenants.Schema.omit("id", ...Struct.keys(Timestamps.fields)).pipe(
      Schema.partial,
    ),
  ),
});

export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];
export const LicenseKey = Schema.UUID;
export const licensesTableName = "licenses";
export const licenses = NonSyncTable<LicensesTable>()(
  licensesTableName,
  Schema.Struct({
    key: LicenseKey,
    tenantId: NanoId,
    status: Schema.Literal(...licenseStatuses),
  }),
  [],
);
export const isLicenseAvailable = new DataAccess.Policy({
  name: "isLicenseAvailable",
  Args: licenses.Schema.pick("key"),
});

export const Timezone = Schema.Literal(...Intl.supportedValuesOf("timeZone"));
export const InfraProgramInput = Schema.Struct({
  papercutSyncCronExpression: Schema.String,
  timezone: Timezone,
});
export const tenantMetadataTableName = "tenant_metadata";
export const tenantMetadata = NonSyncTable<TenantMetadataTable>()(
  tenantMetadataTableName,
  Schema.Struct({
    tenantId: NanoId,
    infraProgramInput: InfraProgramInput,
    apiKey: Schema.NullOr(Schema.String),
    lastPapercutSyncAt: Schema.NullOr(Schema.DateTimeUtc),
    ...Timestamps.fields,
  }),
  [],
);
