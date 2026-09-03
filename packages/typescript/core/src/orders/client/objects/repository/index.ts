import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectsRepository extends Context.Service<OrderObjectsRepository, ServiceShape>()(
  "@printdesk/core/orders/client/ObjectsRepository",
) {}
