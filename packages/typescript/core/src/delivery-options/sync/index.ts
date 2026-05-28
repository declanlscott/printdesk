import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class DeliveryOptionsSync extends Context.Service<DeliveryOptionsSync, ServiceShape>()(
  "@printdesk/core/delivery-options/Sync",
) {}
