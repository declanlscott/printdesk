import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class ProductsRepository extends Context.Service<ProductsRepository, Repository>()(
  "@printdesk/core/products/Repository",
) {}

export class ProductsSyncRepository extends Context.Service<
  ProductsSyncRepository,
  SyncRepository
>()("@printdesk/core/products/SyncRepository") {}
