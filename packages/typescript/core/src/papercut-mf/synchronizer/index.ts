import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class PapercutMfSynchronizer extends Context.Service<PapercutMfSynchronizer, ServiceShape>()(
  "@printdesk/core/papercut-mf/Synchronizer",
) {}
