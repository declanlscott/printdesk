import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountManagerAccessPolicies extends Context.Service<
  SharedAccountManagerAccessPolicies,
  ServiceShape
>()("@printdesk/core/shared-accounts/ManagerAccessPolicies") {}
