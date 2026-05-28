import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountsSync extends Context.Service<SharedAccountsSync, ServiceShape>()(
  "@printdesk/core/shared-accounts/Sync",
) {}
