import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class InvoicesWriteRepository extends Context.Service<
  InvoicesWriteRepository,
  ServiceShape
>()("@printdesk/core/invoices/client/WriteRepository") {}
