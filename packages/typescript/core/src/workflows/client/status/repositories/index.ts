import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class WorkflowStatusesReadRepository extends Context.Service<
  WorkflowStatusesReadRepository,
  ReadRepository
>()("@printdesk/core/workflows/client/StatusesReadRepository") {}

export class WorkflowStatusesWriteRepository extends Context.Service<
  WorkflowStatusesWriteRepository,
  WriteRepository
>()("@printdesk/core/workflows/client/StatusesWriteRepository") {}
