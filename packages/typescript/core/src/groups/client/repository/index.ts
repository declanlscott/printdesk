import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupsReadRepository extends Context.Service<GroupsReadRepository, ServiceShape>()(
  "@printdesk/core/groups/client/ReadRepository",
) {}
