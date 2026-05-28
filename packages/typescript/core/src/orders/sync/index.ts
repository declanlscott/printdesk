import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersSync extends Context.Service<OrdersSync, ServiceShape>()(
  "@printdesk/core/orders/Sync",
) {}
