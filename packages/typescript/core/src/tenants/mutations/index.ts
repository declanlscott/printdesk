import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsMutations extends Context.Service<TenantsMutations, ServiceShape>()(
  "@printdesk/core/tenants/Mutations",
) {}
