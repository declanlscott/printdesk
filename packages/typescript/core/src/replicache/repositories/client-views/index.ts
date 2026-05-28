import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicacheClientViewsRepository extends Context.Service<
  ReplicacheClientViewsRepository,
  ServiceShape
>()("@printdesk/core/replicache/ClientViewsRepository") {}
