import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class SharedAccountManagerAccessReadRepository extends Context.Service<
  SharedAccountManagerAccessReadRepository,
  ReadRepository
>()("@printdesk/core/shared-accounts/client/ManagerAccessReadRepository") {}

export class SharedAccountManagerAccessWriteRepository extends Context.Service<
  SharedAccountManagerAccessWriteRepository,
  WriteRepository
>()("@printdesk/core/shared-accounts/client/ManagerAccessWriteRepository") {}
