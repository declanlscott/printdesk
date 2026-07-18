import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class UsersReadRepository extends Context.Service<UsersReadRepository, ReadRepository>()(
  "@printdesk/core/users/client/ReadRepository",
) {}

export class UsersWriteRepository extends Context.Service<UsersWriteRepository, WriteRepository>()(
  "@printdesk/core/users/client/WriteRepository",
) {}
