import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class UsersPolicies extends Context.Service<UsersPolicies, ServiceShape>()(
  "@printdesk/core/users/client/Policies",
) {}
