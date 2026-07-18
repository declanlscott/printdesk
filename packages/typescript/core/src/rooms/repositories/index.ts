import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class RoomsRepository extends Context.Service<RoomsRepository, Repository>()(
  "@printdesk/core/rooms/Repository",
) {}

export class RoomsSyncRepository extends Context.Service<RoomsSyncRepository, SyncRepository>()(
  "@printdesk/core/rooms/SyncRepository",
) {}
