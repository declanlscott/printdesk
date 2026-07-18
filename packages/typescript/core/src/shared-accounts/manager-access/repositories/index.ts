import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class SharedAccountManagerAccessRepository extends Context.Service<
  SharedAccountManagerAccessRepository,
  Repository
>()("@printdesk/core/shared-accounts/ManagerAccessRepository") {}

export class SharedAccountManagerAccessSyncRepository extends Context.Service<
  SharedAccountManagerAccessSyncRepository,
  SyncRepository
>()("@printdesk/core/shared-accounts/ManagerAccessSyncRepository") {}
