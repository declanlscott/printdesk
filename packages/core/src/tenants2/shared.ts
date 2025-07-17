import { Schema } from "effect";

import { Timestamps } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

export const licensesTableName = "licenses";
export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];
export const LicenseKey = Schema.UUID;
export const License = Schema.Struct({
  key: LicenseKey,
  tenantId: NanoId,
  status: Schema.Literal(...licenseStatuses),
});

export const tenantsTableName = "tenants";
export const tenantStatuses = ["setup", "active", "suspended"] as const;
export type TenantStatus = (typeof tenantStatuses)[number];
export const TenantSubdomain = Schema.String.pipe(
  Schema.pattern(Constants.TENANT_SUBDOMAIN_REGEX),
);
export const Tenant = Schema.Struct({
  id: NanoId,
  subdomain: TenantSubdomain,
  name: Schema.String,
  status: Schema.Literal(...tenantStatuses),
  ...Timestamps.fields,
});
export const UpdateTenant = Schema.extend(
  Schema.Struct({
    id: NanoId,
    updatedAt: Schema.Date,
  }),
  Tenant.omit("id", "createdAt", "updatedAt", "deletedAt").pipe(Schema.partial),
);

export const tenantMetadataTableName = "tenant_metadata";
export const Timezone = Schema.Literal(...Intl.supportedValuesOf("timeZone"));
export const InfraProgramInput = Schema.Struct({
  papercutSyncCronExpression: Schema.String,
  timezone: Timezone,
});
export const TenantMetadata = Schema.Struct({
  tenantId: NanoId,
  infraProgramInput: InfraProgramInput,
  apiKey: Schema.NullOr(Schema.Redacted(Schema.String)),
  lastPapercutSyncAt: Schema.NullOr(Schema.Date),
  ...Timestamps.fields,
});
