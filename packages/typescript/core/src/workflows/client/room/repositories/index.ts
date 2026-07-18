import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class RoomWorkflowsReadRepository extends Context.Service<
  RoomWorkflowsReadRepository,
  ReadRepository
>()("@printdesk/core/workflows/client/RoomsReadRepository") {}

export class RoomWorkflowsWriteRepository extends Context.Service<
  RoomWorkflowsWriteRepository,
  WriteRepository
>()("@printdesk/core/workflows/client/RoomsWriteRepository") {}
