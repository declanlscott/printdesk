import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class UsersSync extends Context.Service<UsersSync, ServiceShape>()(
  "@printdesk/core/users/Sync",
) {}
