import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class RoomsReadRepository extends Context.Service<RoomsReadRepository, ReadRepository>()(
  "@printdesk/core/rooms/client/ReadRepository",
) {}

export class RoomsWriteRepository extends Context.Service<RoomsWriteRepository, WriteRepository>()(
  "@printdesk/core/rooms/client/WriteRepository",
) {}
