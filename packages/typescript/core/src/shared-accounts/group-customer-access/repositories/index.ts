import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class SharedAccountGroupCustomerAccessRepository extends Context.Service<
  SharedAccountGroupCustomerAccessRepository,
  Repository
>()("@printdesk/core/shared-accounts/GroupCustomerAccessRepository") {}

export class SharedAccountGroupCustomerAccessSyncRepository extends Context.Service<
  SharedAccountGroupCustomerAccessSyncRepository,
  SyncRepository
>()("@printdesk/core/shared-accounts/GroupCustomerAccessSyncRepository") {}
