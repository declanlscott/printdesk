import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountsWriteRepository extends Context.Service<
  SharedAccountsWriteRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/WriteRepository") {}
