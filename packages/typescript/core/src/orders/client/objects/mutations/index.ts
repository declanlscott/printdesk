import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectMetadataMutations extends Context.Service<
  OrderObjectMetadataMutations,
  ServiceShape
>()("@printdesk/core/orders/client/ObjectMetadataMutations") {}
