import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountManagerAccessSync extends Context.Service<
  SharedAccountManagerAccessSync,
  ServiceShape
>()("@printdesk/core/shared-accounts/ManagerAccessSync") {}
