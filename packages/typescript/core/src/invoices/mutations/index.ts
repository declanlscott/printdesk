import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class InvoicesMutations extends Context.Service<InvoicesMutations, ServiceShape>()(
  "@printdesk/core/invoices/Mutations",
) {}
