import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class InvoicesRepository extends Context.Service<InvoicesRepository, ServiceShape>()(
  "@printdesk/core/invoices/Repository",
) {}
