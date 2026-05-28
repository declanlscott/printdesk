import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class WorkflowStatusesPolicies extends Context.Service<
  WorkflowStatusesPolicies,
  ServiceShape
>()("@printdesk/core/workflows/StatusesPolicies") {}
