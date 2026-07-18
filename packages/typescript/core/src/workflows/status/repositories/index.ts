import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class WorkflowStatusesRepository extends Context.Service<
  WorkflowStatusesRepository,
  Repository
>()("@printdesk/core/workflows/StatusesRepository") {}

export class WorkflowStatusesSyncRepository extends Context.Service<
  WorkflowStatusesSyncRepository,
  SyncRepository
>()("@printdesk/core/workflows/StatusesSyncRepository") {}
