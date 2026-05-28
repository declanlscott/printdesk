import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class UsersWriteRepository extends Context.Service<UsersWriteRepository, ServiceShape>()(
  "@printdesk/core/users/client/WriteRepository",
) {}
