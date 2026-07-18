import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class RoomWorkflowsRepository extends Context.Service<RoomWorkflowsRepository, Repository>()(
  "@printdesk/core/workflows/RoomWorkflowsRepository",
) {}

export class RoomWorkflowsSyncRepository extends Context.Service<
  RoomWorkflowsSyncRepository,
  SyncRepository
>()("@printdesk/core/workflows/RoomWorkflowsSyncRepository") {}
