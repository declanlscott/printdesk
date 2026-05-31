import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class PapercutEvents extends Context.Service<PapercutEvents, ServiceShape>()(
  "@printdesk/core/papercut/client/Events",
) {}
