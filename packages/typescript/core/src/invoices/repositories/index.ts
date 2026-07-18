import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class InvoicesRepository extends Context.Service<InvoicesRepository, Repository>()(
  "@printdesk/core/invoices/Repository",
) {}

export class InvoicesSyncRepository extends Context.Service<
  InvoicesSyncRepository,
  SyncRepository
>()("@printdesk/core/invoices/SyncRepository") {}
