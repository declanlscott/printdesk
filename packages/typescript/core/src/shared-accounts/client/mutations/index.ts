import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class SharedAccountsMutations extends Context.Service<
  SharedAccountsMutations,
  ServiceShape
>()("@printdesk/core/shared-accounts/client/Mutations") {}
