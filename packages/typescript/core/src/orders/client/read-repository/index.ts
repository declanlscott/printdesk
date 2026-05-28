import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersReadRepository extends Context.Service<OrdersReadRepository, ServiceShape>()(
  "@printdesk/core/orders/client/ReadRepository",
) {}
