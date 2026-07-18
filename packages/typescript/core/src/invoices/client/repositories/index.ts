import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layer";

export class InvoicesReadRepository extends Context.Service<
  InvoicesReadRepository,
  ReadRepository
>()("@printdesk/core/invoices/client/ReadRepository") {}

export class InvoicesWriteRepository extends Context.Service<
  InvoicesWriteRepository,
  WriteRepository
>()("@printdesk/core/invoices/client/WriteRepository") {}
