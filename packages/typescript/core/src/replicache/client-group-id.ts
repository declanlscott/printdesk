import * as Context from "effect/Context";

import type { ReplicacheContract } from "./contracts";

export class ReplicacheClientGroupId extends Context.Service<
  ReplicacheClientGroupId,
  ReplicacheContract.ClientGroupId
>()("@printdesk/core/replicache/ClientGroupId") {}
