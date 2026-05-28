import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountManagerAccessReadRepository extends Context.Service<
  SharedAccountManagerAccessReadRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/ManagerAccessReadRepository") {}
