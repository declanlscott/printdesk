import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ProductsWriteRepository extends Context.Service<
  ProductsWriteRepository,
  ServiceShape
>()("@printdesk/core/products/client/WriteRepository") {}
