import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountManagerAccessRepository extends Context.Service<
  SharedAccountManagerAccessRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/ManagerAccessRepository") {}
