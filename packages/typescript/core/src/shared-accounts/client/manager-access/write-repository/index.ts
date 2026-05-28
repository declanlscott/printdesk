import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountManagerAccessWriteRepository extends Context.Service<
  SharedAccountManagerAccessWriteRepository,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/ManagerAccessWriteRepository") {}
