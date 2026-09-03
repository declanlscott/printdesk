import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectsSync extends Context.Service<OrderObjectsSync, ServiceShape>()(
  "@printdesk/core/orders/ObjectsSync",
) {}
