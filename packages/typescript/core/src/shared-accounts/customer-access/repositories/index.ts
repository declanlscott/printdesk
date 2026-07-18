import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class SharedAccountCustomerAccessRepository extends Context.Service<
  SharedAccountCustomerAccessRepository,
  Repository
>()("@printdesk/core/shared-accounts/CustomerAccessRepository") {}

export class SharedAccountCustomerAccessSyncRepository extends Context.Service<
  SharedAccountCustomerAccessSyncRepository,
  SyncRepository
>()("@printdesk/core/shared-accounts/CustomerAccessSyncRepository") {}
