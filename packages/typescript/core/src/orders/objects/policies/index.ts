import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectsPolicies extends Context.Service<OrderObjectsPolicies, ServiceShape>()(
  "@printdesk/core/orders/ObjectsPolicies",
) {}
