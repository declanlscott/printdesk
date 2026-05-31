import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Subscriptions extends Context.Service<Subscriptions, ServiceShape>()(
  "@printdesk/core/realtime/client/Subscriptions",
) {}
