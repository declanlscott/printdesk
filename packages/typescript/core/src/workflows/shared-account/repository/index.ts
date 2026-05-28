import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountWorkflowsRepository extends Context.Service<
  SharedAccountWorkflowsRepository,
  ServiceShape
>()("@printdesk/core/workflows/SharedAccountsRepository") {}
