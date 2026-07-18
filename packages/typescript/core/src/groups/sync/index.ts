import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupsSync extends Context.Service<GroupsSync, ServiceShape>()(
  "@printdesk/core/groups/Sync",
) {}
