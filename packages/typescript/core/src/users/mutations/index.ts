import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class UsersMutations extends Context.Service<UsersMutations, ServiceShape>()(
  "@printdesk/core/users/Mutations",
) {}
