import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomsWriteRepository extends Context.Service<RoomsWriteRepository, ServiceShape>()(
  "@printdesk/core/rooms/client/WriteRepository",
) {}
