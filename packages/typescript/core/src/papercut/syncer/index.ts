import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class PapercutSyncer extends Context.Service<PapercutSyncer, ServiceShape>()(
  "@printdesk/core/papercut/Syncer",
) {}
