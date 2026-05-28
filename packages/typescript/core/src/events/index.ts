import * as Schema from "effect/Schema";

import { PapercutContract } from "../papercut/contract";
import { ReplicacheContract } from "../replicache/contracts";

export namespace Events {
  export const Event = Schema.Union([PapercutContract.SyncResult, ReplicacheContract.Notification]);
  export type Event = typeof Event.Type;
}
