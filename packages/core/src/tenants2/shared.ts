export const licensesTableName = "licenses";
export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];

export const tenantsTableName = "tenants";
export const tenantStatuses = ["setup", "active", "suspended"] as const;
export type TenantStatus = (typeof tenantStatuses)[number];

export const tenantMetadataTableName = "tenant_metadata";
