import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupsPolicies extends Context.Service<CustomerGroupsPolicies, ServiceShape>()(
  "@printdesk/core/groups/CustomersPolicies",
) {}
