import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectsMutations extends Context.Service<OrderObjectsMutations, ServiceShape>()(
  "@printdesk/core/orders/client/ObjectsMutations",
) {}
