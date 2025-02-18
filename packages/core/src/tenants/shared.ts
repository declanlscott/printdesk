import * as v from "valibot";

import { oauth2ProvidersSchema } from "../auth/shared";
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

export const tenantInfraProgramInputSchema = v.object({
  papercutSyncCronExpression: v.string(),
  timezone: timezoneSchema,
});
export type TenantInfraProgramInput = v.InferOutput<
  typeof tenantInfraProgramInputSchema
>;

export const tenantsTableName = "tenants";

export const tenantSlugSchema = v.pipe(
  v.string(),
  v.regex(
    Constants.TENANT_SLUG_PATTERN,
    "Invalid format, only alphanumeric characters and hyphens are allowed",
  ),
);

export const tenantStatuses = [
  "registered",
  "initializing",
  "active",
  "suspended",
] as const;
export type TenantStatus = (typeof tenantStatuses)[number];

export const tenantSchema = v.object({
  id: nanoIdSchema,
  slug: tenantSlugSchema,
  name: v.string(),
  status: v.picklist(tenantStatuses),
  ...timestampsSchema.entries,
});

export const tenantMutationNames = ["updateTenant"] as const;

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

export const registrationWizardStep1Schema = v.object({
  licenseKey: licenseSchema.entries.key,
  tenantName: tenantSchema.entries.name,
  tenantSlug: tenantSchema.entries.slug,
});
export type RegistrationWizardStep1 = v.InferOutput<
  typeof registrationWizardStep1Schema
>;

export const registrationWizardStep2Schema = v.object({
  userOauthProviderType: oauth2ProvidersSchema.entries.type,
  userOauthProviderId: oauth2ProvidersSchema.entries.id,
});
export type RegistrationWizardStep2 = v.InferOutput<
  typeof registrationWizardStep2Schema
>;

export const registrationWizardStep3Schema = v.object({
  tailscaleOauthClientId: tailscaleOauthClientSchema.entries.id,
  tailscaleOauthClientSecret: tailscaleOauthClientSchema.entries.secret,
});
export type RegistrationWizardStep3 = v.InferOutput<
  typeof registrationWizardStep3Schema
>;

export const registrationWizardStep4Schema = v.object({
  tailnetPapercutServerUri: v.pipe(v.string(), v.trim(), v.url()),
  papercutServerAuthToken: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Auth token cannot be empty."),
  ),
});
export type RegistrationWizardStep4 = v.InferOutput<
  typeof registrationWizardStep4Schema
>;

export const registrationWizardSchema = v.object({
  ...registrationWizardStep1Schema.entries,
  ...registrationWizardStep2Schema.entries,
  ...registrationWizardStep3Schema.entries,
  ...registrationWizardStep4Schema.entries,
  timezone: timezoneSchema,
});
export type RegistrationWizard = v.InferOutput<typeof registrationWizardSchema>;

export const registrationParameters = [
  "tailscaleOauthClientId",
  "tailscaleOauthClientSecret",
  "tailnetPapercutServerUri",
  "papercutServerAuthToken",
] as const;

export const registerDataSchema = v.omit(
  registrationWizardSchema,
  registrationParameters,
);
export type RegisterData = v.InferOutput<typeof registerDataSchema>;

export const initializeDataSchema = v.pick(
  registrationWizardSchema,
  registrationParameters,
);
export type InitializeData = v.InferOutput<typeof initializeDataSchema>;

export const tenantMetadataTableName = "tenant_metadata";

export const tenantMetadataSchema = v.object({
  id: nanoIdSchema,
  infraProgramInput: tenantInfraProgramInputSchema,
  tenantId: nanoIdSchema,
  ...timestampsSchema.entries,
});
