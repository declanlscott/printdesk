import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class MutationDispatcher extends Context.Service<MutationDispatcher, ServiceShape>()(
  "@printdesk/core/mutations/client/Dispatcher",
) {}
