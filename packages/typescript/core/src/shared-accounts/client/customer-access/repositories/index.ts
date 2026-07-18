import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class SharedAccountCustomerAccessReadRepository extends Context.Service<
  SharedAccountCustomerAccessReadRepository,
  ReadRepository
>()("@printdesk/core/shared-accounts/client/CustomerAccessReadRepository") {}

export class SharedAccountCustomerAccessWriteRepository extends Context.Service<
  SharedAccountCustomerAccessWriteRepository,
  WriteRepository
>()("@printdesk/core/shared-accounts/client/CustomerAccessWriteRepository") {}
