import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class UsersRepository extends Context.Service<UsersRepository, Repository>()(
  "@printdesk/core/users/Repository",
) {}

export class UsersSyncRepository extends Context.Service<UsersSyncRepository, SyncRepository>()(
  "@printdesk/core/users/SyncRepository",
) {}
