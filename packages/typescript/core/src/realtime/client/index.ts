import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Realtime extends Context.Service<Realtime, ServiceShape>()(
  "@printdesk/core/realtime/client/Realtime",
) {}
