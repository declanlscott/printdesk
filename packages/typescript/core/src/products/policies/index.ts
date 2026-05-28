import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ProductsPolicies extends Context.Service<ProductsPolicies, ServiceShape>()(
  "@printdesk/core/products/Policies",
) {}
