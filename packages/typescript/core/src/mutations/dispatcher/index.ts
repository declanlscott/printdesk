import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class MutationsDispatcher extends Context.Service<MutationsDispatcher, ServiceShape>()(
  "@printdesk/core/mutations/Dispatcher",
) {}
