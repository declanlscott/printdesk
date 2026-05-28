import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class CustomerGroupsSync extends Context.Service<CustomerGroupsSync, ServiceShape>()(
  "@printdesk/core/groups/CustomersSync",
) {}
