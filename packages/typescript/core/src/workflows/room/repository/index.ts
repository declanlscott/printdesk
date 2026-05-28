import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomWorkflowsRepository extends Context.Service<
  RoomWorkflowsRepository,
  ServiceShape
>()("@printdesk/core/workflows/RoomWorkflowsRepository") {}
