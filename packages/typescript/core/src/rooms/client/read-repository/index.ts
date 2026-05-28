import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomsReadRepository extends Context.Service<RoomsReadRepository, ServiceShape>()(
  "@printdesk/core/rooms/client/ReadRepository",
) {}
