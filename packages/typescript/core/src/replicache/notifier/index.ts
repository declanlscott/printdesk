import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicacheNotifier extends Context.Service<ReplicacheNotifier, ServiceShape>()(
  "@printdesk/core/replicache/Notifier",
) {}
