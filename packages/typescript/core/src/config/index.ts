import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class Config extends Context.Service<Config, ServiceShape>()(
  "@printdesk/core/config/Config",
) {}
