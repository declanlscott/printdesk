import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomsMutations extends Context.Service<RoomsMutations, ServiceShape>()(
  "@printdesk/core/rooms/client/Mutations",
) {}
