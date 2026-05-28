import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsRepository extends Context.Service<TenantsRepository, ServiceShape>()(
  "@printdesk/core/tenants/Repository",
) {}
