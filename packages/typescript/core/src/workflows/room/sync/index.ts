import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class RoomWorkflowsSync extends Context.Service<RoomWorkflowsSync, ServiceShape>()(
  "@printdesk/core/workflows/RoomWorkflowsSync",
) {}
