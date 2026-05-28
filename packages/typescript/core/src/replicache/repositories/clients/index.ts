import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class ReplicacheClientsRepository extends Context.Service<
  ReplicacheClientsRepository,
  ServiceShape
>()("@printdesk/core/replicache/ClientsRepository") {}
