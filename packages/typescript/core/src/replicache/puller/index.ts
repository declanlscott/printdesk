import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicachePuller extends Context.Service<ReplicachePuller, ServiceShape>()(
  "@printdesk/core/replicache/Puller",
) {}
