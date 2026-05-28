import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersPolicies extends Context.Service<OrdersPolicies, ServiceShape>()(
  "@printdesk/core/orders/client/Policies",
) {}
