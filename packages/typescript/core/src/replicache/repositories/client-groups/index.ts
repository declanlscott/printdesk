import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicacheClientGroupsRepository extends Context.Service<
  ReplicacheClientGroupsRepository,
  ServiceShape
>()("@printdesk/core/replicache/ClientGroupsRepository") {}
