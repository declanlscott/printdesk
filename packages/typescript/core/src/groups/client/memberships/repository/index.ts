import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupMembershipsRepository extends Context.Service<
  GroupMembershipsRepository,
  ServiceShape
>()("@printdesk/core/groups/client/MembershipsRepository") {}
