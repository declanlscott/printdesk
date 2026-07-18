import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Synchronizer extends Context.Service<Synchronizer, ServiceShape>()(
  "@printdesk/core/sync/Synchronizer",
) {}
