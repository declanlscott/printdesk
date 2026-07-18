import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class SharedAccountWorkflowsReadRepository extends Context.Service<
  SharedAccountWorkflowsReadRepository,
  ReadRepository
>()("@printdesk/core/workflows/client/SharedAccountsReadRepository") {}

export class SharedAccountWorkflowsWriteRepository extends Context.Service<
  SharedAccountWorkflowsWriteRepository,
  WriteRepository
>()("@printdesk/core/workflows/client/SharedAccountsWriteRepository") {}
