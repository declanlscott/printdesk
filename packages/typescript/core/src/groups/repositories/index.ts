import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class GroupsRepository extends Context.Service<GroupsRepository, Repository>()(
  "@printdesk/core/groups/Repository",
) {}

export class GroupsSyncRepository extends Context.Service<GroupsSyncRepository, SyncRepository>()(
  "@printdesk/core/groups/SyncRepository",
) {}
