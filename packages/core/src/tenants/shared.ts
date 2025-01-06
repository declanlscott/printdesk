import * as v from "valibot";

import { oauth2ProvidersSchema } from "../auth/shared";
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

export const tenantMetadataTableName = "tenant_metadata";

export const tenantInfraProgramInputSchema = v.object({
  papercutSyncSchedule: v.pipe(
    v.optional(v.string(), "55 1 * * ? *"),
    v.trim(),
  ),
  timezone: v.picklist(Intl.supportedValuesOf("timeZone")),
});
export type TenantInfraProgramInput = v.InferOutput<
  typeof tenantInfraProgramInputSchema
>;

export const tenantsTableName = "tenants";

export const tenantStatuses = ["initializing", "active", "suspended"] as const;
export type TenantStatus = (typeof tenantStatuses)[number];

export const tenantSchema = v.object({
  id: nanoIdSchema,
  slug: v.pipe(
    v.string(),
    v.regex(
      Constants.TENANT_SLUG_PATTERN,
      "Invalid format, only alphanumeric characters and hyphens are allowed",
    ),
  ),
  name: v.string(),
  status: v.picklist(tenantStatuses),
  licenseKey: v.pipe(v.string(), v.uuid()),
  oauth2ProviderId: v.nullable(v.string()),
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

const registrationStepsSchemas = [
  v.object({
    licenseKey: licenseSchema.entries.key,
    tenantName: tenantSchema.entries.name,
    tenantSlug: tenantSchema.entries.slug,
  }),
  v.object({
    oauth2ProviderVariant: oauth2ProvidersSchema.entries.variant,
    oauth2ProviderId: oauth2ProvidersSchema.entries.id,
  }),
  v.object({
    papercutAuthToken: v.string(),
    tailscaleOauth2ClientId: v.string(),
    tailscaleOauth2ClientSecret: v.string(),
  }),
] as const;

export const registrationStep1Schema = v.object({
  ...v.partial(registrationStepsSchemas[0]).entries,
  ...v.partial(registrationStepsSchemas[1]).entries,
  ...v.partial(registrationStepsSchemas[2]).entries,
});
export type RegistrationStep1 = v.InferOutput<typeof registrationStep1Schema>;

export const registrationStep2Schema = v.object({
  ...registrationStepsSchemas[0].entries,
  ...v.partial(registrationStepsSchemas[1]).entries,
  ...v.partial(registrationStepsSchemas[2]).entries,
});
export type RegistrationStep2 = v.InferOutput<typeof registrationStep2Schema>;

export const registrationStep3Schema = v.object({
  ...registrationStepsSchemas[0].entries,
  ...registrationStepsSchemas[1].entries,
  ...v.partial(registrationStepsSchemas[2]).entries,
});
export type RegistrationStep3 = v.InferOutput<typeof registrationStep3Schema>;

export const registrationSchema = v.object({
  ...registrationStepsSchemas[0].entries,
  ...registrationStepsSchemas[1].entries,
  ...registrationStepsSchemas[2].entries,
});
export type Registration = v.InferOutput<typeof registrationSchema>;
