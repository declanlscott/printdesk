import * as Context from "effect/Context";

import type { ReadRepository, WriteRepository } from "./layers";

export class DeliveryOptionsReadRepository extends Context.Service<
  DeliveryOptionsReadRepository,
  ReadRepository
>()("@printdesk/core/delivery-options/client/ReadRepository") {}

export class DeliveryOptionsWriteRepository extends Context.Service<
  DeliveryOptionsWriteRepository,
  WriteRepository
>()("@printdesk/core/delivery-options/client/WriteRepository") {}
