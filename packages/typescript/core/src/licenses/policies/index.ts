import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class LicensesPolicies extends Context.Service<LicensesPolicies, ServiceShape>()(
  "@printdesk/core/tenants/LicensePolicies",
) {}
