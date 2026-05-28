import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsWriteRepository extends Context.Service<TenantsWriteRepository, ServiceShape>()(
  "@printdesk/core/tenants/client/WriteRepository",
) {}
