import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class WorkflowStatusesMutations extends Context.Service<
  WorkflowStatusesMutations,
  ServiceShape
>()("@printdesk/core/workflows/StatusesMutations") {}
