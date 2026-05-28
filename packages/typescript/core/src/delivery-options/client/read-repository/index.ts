import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class DeliveryOptionsReadRepository extends Context.Service<
  DeliveryOptionsReadRepository,
  ServiceShape
>()("@printdesk/core/delivery-options/client/ReadRepository") {}
