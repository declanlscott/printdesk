import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class UsersReadRepository extends Context.Service<UsersReadRepository, ServiceShape>()(
  "@printdesk/core/users/client/ReadRepository",
) {}
