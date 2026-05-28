import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class WorkflowStatusesRepository extends Context.Service<
  WorkflowStatusesRepository,
  ServiceShape
>()("@printdesk/core/workflows/StatusesRepository") {}
