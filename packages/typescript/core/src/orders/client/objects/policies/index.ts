import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectMetadataPolicies extends Context.Service<
  OrderObjectMetadataPolicies,
  ServiceShape
>()("@printdesk/core/orders/client/ObjectMetadataPolicies") {}
