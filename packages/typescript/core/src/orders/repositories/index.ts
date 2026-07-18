import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class OrdersRepository extends Context.Service<OrdersRepository, Repository>()(
  "@printdesk/core/orders/Repository",
) {}

export class OrdersSyncRepository extends Context.Service<OrdersSyncRepository, SyncRepository>()(
  "@printdesk/core/orders/SyncRepository",
) {}
