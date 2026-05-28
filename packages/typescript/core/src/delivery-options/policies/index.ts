import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class DeliveryOptionsPolicies extends Context.Service<
  DeliveryOptionsPolicies,
  ServiceShape
>()("@printdesk/core/delivery-options/Policies") {}
