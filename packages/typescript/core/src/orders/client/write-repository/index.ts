import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersWriteRepository extends Context.Service<OrdersWriteRepository, ServiceShape>()(
  "@printdesk/core/orders/client/WriteRepository",
) {}
