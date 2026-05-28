import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicacheClientViewEntriesRepository extends Context.Service<
  ReplicacheClientViewEntriesRepository,
  ServiceShape
>()("@printdesk/core/replicache/ClientViewEntriesRepository") {}
