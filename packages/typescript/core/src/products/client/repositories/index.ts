import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class ProductsReadRepository extends Context.Service<
  ProductsReadRepository,
  ReadRepository
>()("@printdesk/core/products/client/ReadRepository") {}

export class ProductsWriteRepository extends Context.Service<
  ProductsWriteRepository,
  WriteRepository
>()("@printdesk/core/products/client/WriteRepository") {}
