import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class PoliciesDispatcher extends Context.Service<PoliciesDispatcher, ServiceShape>()(
  "@printdesk/core/policies/client/Dispatcher",
) {}
