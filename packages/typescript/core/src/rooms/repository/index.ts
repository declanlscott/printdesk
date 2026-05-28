import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomsRepository extends Context.Service<RoomsRepository, ServiceShape>()(
  "@printdesk/core/rooms/Repository",
) {}
