import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class GroupMembershipsRepository extends Context.Service<
  GroupMembershipsRepository,
  Repository
>()("@printdesk/core/groups/MembershipsRepository") {}

export class GroupMembershipsSyncRepository extends Context.Service<
  GroupMembershipsSyncRepository,
  SyncRepository
>()("@printdesk/core/groups/MembershipsSyncRepository") {}
