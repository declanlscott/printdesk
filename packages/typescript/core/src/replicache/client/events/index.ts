import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicacheEvents extends Context.Service<ReplicacheEvents, ServiceShape>()(
  "@printdesk/core/replicache/client/Events",
) {}
