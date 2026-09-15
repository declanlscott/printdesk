import * as Context from "effect/Context";

import type { Repository, SyncRepository } from "./layers";

export class OrderObjectMetadataRepository extends Context.Service<
  OrderObjectMetadataRepository,
  Repository
>()("@printdesk/core/orders/ObjectMetadataRepository") {}

export class OrderObjectMetadataSyncRepository extends Context.Service<
  OrderObjectMetadataSyncRepository,
  SyncRepository
>()("@printdesk/core/orders/ObjectMetadataSyncRepository") {}
