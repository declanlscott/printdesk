import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class TenantsProvisioner extends Context.Service<TenantsProvisioner, ServiceShape>()(
  "@printdesk/core/tenants/Provisioner",
) {}
