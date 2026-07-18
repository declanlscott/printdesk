import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class SharedAccountsReadRepository extends Context.Service<
  SharedAccountsReadRepository,
  ReadRepository
>()("@printdesk/core/shared-accounts/client/ReadRepository") {}

export class SharedAccountsWriteRepository extends Context.Service<
  SharedAccountsWriteRepository,
  WriteRepository
>()("@printdesk/core/shared-accounts/client/WriteRepository") {}
