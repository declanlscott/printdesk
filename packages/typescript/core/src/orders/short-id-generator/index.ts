import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersShortIdGenerator extends Context.Service<OrdersShortIdGenerator, ServiceShape>()(
  "@printdesk/core/orders/ShortIdGenerator",
) {}
