import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class SharedAccountWorkflowsRepository extends Context.Service<
  SharedAccountWorkflowsRepository,
  Repository
>()("@printdesk/core/workflows/SharedAccountsRepository") {}

export class SharedAccountWorkflowsSyncRepository extends Context.Service<
  SharedAccountWorkflowsSyncRepository,
  SyncRepository
>()("@printdesk/core/workflows/SharedAccountsSyncRepository") {}
