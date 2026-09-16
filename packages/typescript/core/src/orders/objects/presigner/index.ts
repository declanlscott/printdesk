import * as Context from "effect/Context";

import type { ServiceShape } from "../presigner/layer";

export class OrderObjectsPresigner extends Context.Service<OrderObjectsPresigner, ServiceShape>()(
  "@printdesk/core/orders/ObjectsPresigner",
) {}
