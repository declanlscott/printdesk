import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class PapercutMfSyncer extends Context.Service<PapercutMfSyncer, ServiceShape>()(
  "@printdesk/core/papercut-mf/Syncer",
) {}
