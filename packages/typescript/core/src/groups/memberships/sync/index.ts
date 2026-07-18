import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupMembershipsSync extends Context.Service<GroupMembershipsSync, ServiceShape>()(
  "@printdesk/core/groups/MembershipsSync",
) {}
