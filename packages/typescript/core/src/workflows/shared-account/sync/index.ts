import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountWorkflowsSync extends Context.Service<
  SharedAccountWorkflowsSync,
  ServiceShape
>()("@printdesk/core/workflows/SharedAccountWorkflowsSync") {}
