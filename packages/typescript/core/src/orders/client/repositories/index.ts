import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class OrdersReadRepository extends Context.Service<OrdersReadRepository, ReadRepository>()(
  "@printdesk/core/orders/client/ReadRepository",
) {}

export class OrdersWriteRepository extends Context.Service<
  OrdersWriteRepository,
  WriteRepository
>()("@printdesk/core/orders/client/WriteRepository") {}
