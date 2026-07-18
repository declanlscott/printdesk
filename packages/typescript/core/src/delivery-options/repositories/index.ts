import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class DeliveryOptionsRepository extends Context.Service<
  DeliveryOptionsRepository,
  Repository
>()("@printdesk/core/delivery-options/Repository") {}

export class DeliveryOptionsSyncRepository extends Context.Service<
  DeliveryOptionsSyncRepository,
  SyncRepository
>()("@printdesk/core/delivery-options/SyncRepository") {}
