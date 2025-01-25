import * as v from "valibot";

import { oauth2ProvidersSchema } from "../auth/shared";
import { tailscaleOauthClientSchema } from "../tailscale/shared";
import { Constants } from "../utils/constants";
import { nanoIdSchema, timestampsSchema } from "../utils/shared";

export const licensesTableName = "licenses";

export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];

export const licenseSchema = v.object({
  key: v.pipe(v.string(), v.uuid("Invalid license key format")),
  tenantId: nanoIdSchema,
  status: v.picklist(licenseStatuses),
});

export const defaultPapercutSyncSchedule = "55 1 * * ? *";

export const tenantInfraProgramInputSchema = v.object({
  papercutSyncSchedule: v.pipe(
    v.optional(v.string(), defaultPapercutSyncSchedule),
    v.trim(),
  ),
  timezone: v.picklist(Intl.supportedValuesOf("timeZone")),
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

export const tenantStatuses = ["initializing", "active", "suspended"] as const;
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
  tailnetPapercutServerUri: v.pipe(v.string(), v.url()),
  papercutServerAuthToken: v.string(),
});
export type RegistrationWizardStep4 = v.InferOutput<
  typeof registrationWizardStep4Schema
>;

export const registrationWizardStep5Schema = tenantInfraProgramInputSchema;
export type RegistrationWizardStep5 = v.InferOutput<
  typeof registrationWizardStep5Schema
>;

export const registrationSchema = v.object({
  ...registrationWizardStep1Schema.entries,
  ...registrationWizardStep2Schema.entries,
  ...registrationWizardStep3Schema.entries,
  ...registrationWizardStep4Schema.entries,
  ...registrationWizardStep5Schema.entries,
});
export type Registration = v.InferOutput<typeof registrationSchema>;

export const tenantMetadataTableName = "tenant_metadata";

export const tenantMetadataSchema = v.object({
  id: nanoIdSchema,
  infraProgramInput: tenantInfraProgramInputSchema,
  tenantId: nanoIdSchema,
  ...timestampsSchema.entries,
});
