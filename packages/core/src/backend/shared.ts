import type { Tenant } from "../tenants/sql";

export const getBackendFqdn = (tenantId: Tenant["id"], baseFqdn: string) =>
  [tenantId, "backend", baseFqdn].join(".");
