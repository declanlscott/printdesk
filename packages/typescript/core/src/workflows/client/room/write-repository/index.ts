import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomWorkflowsWriteRepository extends Context.Service<
  RoomWorkflowsWriteRepository,
  ServiceShape
>()("@printdesk/core/workflows/client/RoomsWriteRepository") {}
