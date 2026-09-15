import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class OrderObjectMetadataRepository extends Context.Service<
  OrderObjectMetadataRepository,
  ServiceShape
>()("@printdesk/core/orders/client/ObjectMetadataRepository") {}
