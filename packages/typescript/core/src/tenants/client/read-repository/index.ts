import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsReadRepository extends Context.Service<TenantsReadRepository, ServiceShape>()(
  "@printdesk/core/tenants/client/ReadRepository",
) {}
