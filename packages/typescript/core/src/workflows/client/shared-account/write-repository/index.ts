import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountWorkflowsWriteRepository extends Context.Service<
  SharedAccountWorkflowsWriteRepository,
  ServiceShape
>()("@printdesk/core/workflows/client/SharedAccountsWriteRepository") {}
