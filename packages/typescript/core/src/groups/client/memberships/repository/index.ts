import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupMembershipsReadRepository extends Context.Service<
  GroupMembershipsReadRepository,
  ServiceShape
>()("@printdesk/core/groups/client/MembershipsReadRepository") {}
