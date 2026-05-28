import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountWorkflowsPolicies extends Context.Service<
  SharedAccountWorkflowsPolicies,
  ServiceShape
>()("@printdesk/core/workflows/SharedAccountWorkflowsPolicies") {}
