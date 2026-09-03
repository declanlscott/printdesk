import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class OrderObjectsRepository extends Context.Service<OrderObjectsRepository, Repository>()(
  "@printdesk/core/orders/ObjectsRepository",
) {}

export class OrderObjectsSyncRepository extends Context.Service<
  OrderObjectsSyncRepository,
  SyncRepository
>()("@printdesk/core/orders/ObjectsSyncRepository") {}
