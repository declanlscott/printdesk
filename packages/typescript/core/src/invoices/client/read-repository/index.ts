import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class InvoicesReadRepository extends Context.Service<InvoicesReadRepository, ServiceShape>()(
  "@printdesk/core/invoices/client/ReadRepository",
) {}
