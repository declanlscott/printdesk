import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountsRepository extends Context.Service<
  SharedAccountsRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/Repository") {}
