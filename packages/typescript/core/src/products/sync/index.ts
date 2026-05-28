import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ProductsSync extends Context.Service<ProductsSync, ServiceShape>()(
  "@printdesk/core/products/Sync",
) {}
