import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsRegistry extends Context.Service<TenantsRegistry, ServiceShape>()(
  "@printdesk/core/tenants/Registry",
) {}
