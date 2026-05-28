import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ProductsMutations extends Context.Service<ProductsMutations, ServiceShape>()(
  "@printdesk/core/products/client/Mutations",
) {}
