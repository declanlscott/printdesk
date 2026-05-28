import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ProductsRepository extends Context.Service<ProductsRepository, ServiceShape>()(
  "@printdesk/core/products/Repository",
) {}
