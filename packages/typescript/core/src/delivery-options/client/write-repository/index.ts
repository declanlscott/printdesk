import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class DeliveryOptionsWriteRepository extends Context.Service<
  DeliveryOptionsWriteRepository,
  ServiceShape
>()("@printdesk/core/delivery-options/client/WriteRepository") {}
