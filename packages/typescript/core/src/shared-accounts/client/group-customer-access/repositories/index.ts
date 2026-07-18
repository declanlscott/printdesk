import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class SharedAccountGroupCustomerAccessReadRepository extends Context.Service<
  SharedAccountGroupCustomerAccessReadRepository,
  ReadRepository
>()("@printdesk/core/shared-accounts/client/GroupCustomerAccessReadRepository") {}

export class SharedAccountGroupCustomerAccessWriteRepository extends Context.Service<
  SharedAccountGroupCustomerAccessWriteRepository,
  WriteRepository
>()("@printdesk/core/shared-accounts/client/GroupCustomerAccessWriteRepository") {}
