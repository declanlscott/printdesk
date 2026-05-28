import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class DeliveryOptionsMutations extends Context.Service<
  DeliveryOptionsMutations,
  ServiceShape
>()("@printdesk/core/delivery-options/client/Mutations") {}
