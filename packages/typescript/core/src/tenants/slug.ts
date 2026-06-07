import * as Context from "effect/Context";

import type { TenantsContract } from "./contract";

export class TenantSlug extends Context.Service<TenantSlug, TenantsContract.Slug>()(
  "@printdesk/core/tenants/Slug",
) {}
