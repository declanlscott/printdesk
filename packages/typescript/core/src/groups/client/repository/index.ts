import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupsRepository extends Context.Service<GroupsRepository, ServiceShape>()(
  "@printdesk/core/groups/client/Repository",
) {}
