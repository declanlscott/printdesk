import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomWorkflowsReadRepository extends Context.Service<
  RoomWorkflowsReadRepository,
  ServiceShape
>()("@printdesk/core/workflows/client/RoomsReadRepository") {}
