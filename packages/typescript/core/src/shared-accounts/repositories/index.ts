import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class SharedAccountsRepository extends Context.Service<
  SharedAccountsRepository,
  Repository
>()("@printdesk/core/shared-accounts/Repository") {}

export class SharedAccountsSyncRepository extends Context.Service<
  SharedAccountsSyncRepository,
  SyncRepository
>()("@printdesk/core/shared-accounts/SyncRepository") {}
