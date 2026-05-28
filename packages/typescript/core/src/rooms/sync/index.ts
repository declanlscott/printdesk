import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomsSync extends Context.Service<RoomsSync, ServiceShape>()(
  "@printdesk/core/rooms/Sync",
) {}
