import * as Context from "effect/Context";
import * as Request from "effect/Request";
import * as Schema from "effect/Schema";

import type { ReplicacheContract } from "../contracts";
import type { ServiceShape } from "./layer";

export class ReplicacheNotifyError extends Schema.TaggedErrorClass<ReplicacheNotifyError>()(
  "ReplicacheNotifyError",
  { cause: Schema.Defect() },
) {}

export class ReplicacheNotifyRequest extends Request.Class<
  ReplicacheContract.Notification,
  void,
  ReplicacheNotifyError
> {}

export class ReplicacheNotifier extends Context.Service<ReplicacheNotifier, ServiceShape>()(
  "@printdesk/core/replicache/Notifier",
) {}
