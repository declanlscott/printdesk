import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class TenantsRepository extends Context.Service<TenantsRepository, Repository>()(
  "@printdesk/core/tenants/Repository",
) {}

export class TenantsSyncRepository extends Context.Service<TenantsSyncRepository, SyncRepository>()(
  "@printdesk/core/tenants/SyncRepository",
) {}
