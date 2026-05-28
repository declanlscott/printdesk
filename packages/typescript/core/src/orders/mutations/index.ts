import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrdersMutations extends Context.Service<OrdersMutations, ServiceShape>()(
  "@printdesk/core/orders/Mutations",
) {}
