import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class PolicyDispatcher extends Context.Service<PolicyDispatcher, ServiceShape>()(
  "@printdesk/core/policies/client/Dispatcher",
) {}
