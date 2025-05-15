import * as v from "valibot";

import { identityProvidersSchema } from "../auth/shared";
import { tailscaleOauthClientSchema } from "../tailscale/shared";
import { Constants } from "../utils/constants";
import { nanoIdSchema, timestampsSchema } from "../utils/shared";

export const licensesTableName = "licenses";

export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];

export const licenseKeySchema = v.pipe(
  v.string(),
  v.uuid("Invalid license key format"),
);

export const licenseSchema = v.object({
  key: licenseKeySchema,
  tenantId: nanoIdSchema,
  status: v.picklist(licenseStatuses),
});

export const timezoneSchema = v.picklist(Intl.supportedValuesOf("timeZone"));

export const infraProgramInputSchema = v.object({
  papercutSyncCronExpression: v.string(),
  timezone: timezoneSchema,
});
export type InfraProgramInput = v.InferOutput<typeof infraProgramInputSchema>;

export const tenantsTableName = "tenants";

export const tenantSubdomainSchema = v.pipe(
  v.string(),
  v.regex(
    Constants.TENANT_SUBDOMAIN_PATTERN,
    "Invalid format, only alphanumeric characters and hyphens are allowed",
  ),
);

export const tenantStatuses = ["setup", "active", "suspended"] as const;
export type TenantStatus = (typeof tenantStatuses)[number];

export const tenantSchema = v.object({
  id: nanoIdSchema,
  subdomain: tenantSubdomainSchema,
  name: v.string(),
  status: v.picklist(tenantStatuses),
  ...timestampsSchema.entries,
});

export const updateTenantMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.date(),
  ...v.partial(
    v.omit(tenantSchema, ["id", "createdAt", "updatedAt", "deletedAt"]),
  ).entries,
});
export type UpdateTenantMutationArgs = v.InferOutput<
  typeof updateTenantMutationArgsSchema
>;

export const setupWizardStep1Schema = v.object({
  licenseKey: licenseSchema.entries.key,
  tenantName: tenantSchema.entries.name,
  tenantSubdomain: v.nonNullable(tenantSchema.entries.subdomain),
});
export type SetupWizardStep1 = v.InferOutput<typeof setupWizardStep1Schema>;

export const setupWizardStep2Schema = v.object({
  identityProviderKind: identityProvidersSchema.entries.kind,
  identityProviderId: identityProvidersSchema.entries.id,
});
export type SetupWizardStep2 = v.InferOutput<typeof setupWizardStep2Schema>;

export const setupWizardStep3Schema = v.object({
  tailscaleOauthClientId: tailscaleOauthClientSchema.entries.id,
  tailscaleOauthClientSecret: tailscaleOauthClientSchema.entries.secret,
});
export type SetupWizardStep3 = v.InferOutput<typeof setupWizardStep3Schema>;

export const setupWizardStep4Schema = v.object({
  tailnetPapercutServerUri: v.pipe(v.string(), v.trim(), v.url()),
  papercutServerAuthToken: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Auth token cannot be empty."),
  ),
});
export type SetupWizardStep4 = v.InferOutput<typeof setupWizardStep4Schema>;

export const setupWizardSchema = v.object({
  ...setupWizardStep1Schema.entries,
  ...setupWizardStep2Schema.entries,
  ...setupWizardStep3Schema.entries,
  ...setupWizardStep4Schema.entries,
  timezone: timezoneSchema,
});
export type SetupWizard = v.InferOutput<typeof setupWizardSchema>;

const initializeKeys = ["licenseKey", "timezone"] as const;

export const initializeDataSchema = v.pick(setupWizardSchema, initializeKeys);
export type InitializeData = v.InferOutput<typeof initializeDataSchema>;

const configureKeys = [
  "tailscaleOauthClientId",
  "tailscaleOauthClientSecret",
  "tailnetPapercutServerUri",
  "papercutServerAuthToken",
] as const;

export const registerDataSchema = v.omit(setupWizardSchema, [
  ...initializeKeys,
  ...configureKeys,
]);
export type RegisterData = v.InferOutput<typeof registerDataSchema>;

export const configureDataSchema = v.pick(setupWizardSchema, configureKeys);
export type ConfigureData = v.InferOutput<typeof configureDataSchema>;

export const tenantMetadataTableName = "tenant_metadata";

export const tenantMetadataSchema = v.object({
  tenantId: nanoIdSchema,
  infraProgramInput: infraProgramInputSchema,
  apiKey: v.nullable(v.string()),
  lastPapercutSyncAt: v.nullable(v.date()),
  ...timestampsSchema.entries,
});
