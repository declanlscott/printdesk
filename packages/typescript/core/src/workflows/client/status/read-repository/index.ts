import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class WorkflowStatusesReadRepository extends Context.Service<
  WorkflowStatusesReadRepository,
  ServiceShape
>()("@printdesk/core/workflows/client/StatusesReadRepository") {}
