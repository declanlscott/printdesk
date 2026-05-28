import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountsPolicies extends Context.Service<SharedAccountsPolicies, ServiceShape>()(
  "@printdesk/core/shared-accounts/Policies",
) {}
