import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountWorkflowsReadRepository extends Context.Service<
  SharedAccountWorkflowsReadRepository,
  ServiceShape
>()("@printdesk/core/workflows/client/SharedAccountsReadRepository") {}
