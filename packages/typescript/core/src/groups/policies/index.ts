import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class GroupsPolicies extends Context.Service<GroupsPolicies, ServiceShape>()(
  "@printdesk/core/groups/Policies",
) {}
