import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class WorkflowStatusesWriteRepository extends Context.Service<
  WorkflowStatusesWriteRepository,
  ServiceShape
>()("@printdesk/core/workflows/client/StatusesWriteRepository") {}
