import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountsReadRepository extends Context.Service<
  SharedAccountsReadRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/ReadRepository") {}
