import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsSync extends Context.Service<TenantsSync, ServiceShape>()(
  "@printdesk/core/tenants/Sync",
) {}
