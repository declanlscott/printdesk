import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountManagerAccessMutations extends Context.Service<
  SharedAccountManagerAccessMutations,
  ServiceShape
>()("@printdesk/core/shared-accounts/ManagerAccessMutations") {}
