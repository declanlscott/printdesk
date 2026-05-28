import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class LicensesRepository extends Context.Service<LicensesRepository, ServiceShape>()(
  "@printdesk/core/tenants/LicensesRepository",
) {}
