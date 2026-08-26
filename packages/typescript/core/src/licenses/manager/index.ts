import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class LicensesManager extends Context.Service<LicensesManager, ServiceShape>()(
  "@printdesk/core/licenses/Manager",
) {}
