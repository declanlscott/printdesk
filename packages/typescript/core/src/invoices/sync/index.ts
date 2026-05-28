import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class InvoicesSync extends Context.Service<InvoicesSync, ServiceShape>()(
  "@printdesk/core/invoices/Sync",
) {}
