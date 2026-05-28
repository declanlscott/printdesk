import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomsPolicies extends Context.Service<RoomsPolicies, ServiceShape>()(
  "@printdesk/core/rooms/Policies",
) {}
