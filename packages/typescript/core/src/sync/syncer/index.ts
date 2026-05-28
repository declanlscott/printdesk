import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Syncer extends Context.Service<Syncer, ServiceShape>()(
  "@printdesk/core/syncer/Syncer",
) {}
