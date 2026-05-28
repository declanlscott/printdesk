import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ProductsReadRepository extends Context.Service<ProductsReadRepository, ServiceShape>()(
  "@printdesk/core/products/client/ReadRepository",
) {}
