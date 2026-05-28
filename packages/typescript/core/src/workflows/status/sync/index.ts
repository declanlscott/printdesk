import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class WorkflowStatusesSync extends Context.Service<WorkflowStatusesSync, ServiceShape>()(
  "@printdesk/core/workflows/StatusesSync",
) {}
