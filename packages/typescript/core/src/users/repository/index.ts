import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class UsersRepository extends Context.Service<UsersRepository, ServiceShape>()(
  "@printdesk/core/users/Repository",
) {}
