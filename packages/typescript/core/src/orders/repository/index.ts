import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersRepository extends Context.Service<OrdersRepository, ServiceShape>()(
  "@printdesk/core/orders/Repository",
) {}
