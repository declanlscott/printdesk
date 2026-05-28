import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class DeliveryOptionsRepository extends Context.Service<
  DeliveryOptionsRepository,
  ServiceShape
>()("@printdesk/core/delivery-options/Repository") {}
