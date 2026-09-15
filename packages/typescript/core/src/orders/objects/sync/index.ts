import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectMetadataSync extends Context.Service<
  OrderObjectMetadataSync,
  ServiceShape
>()("@printdesk/core/orders/ObjectMetadataSync") {}
