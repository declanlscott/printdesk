import { Handler } from ".";
import { PapercutContract } from "../papercut/contract";
import { ReplicacheContract } from "../replicache/contracts";

export namespace RealtimeEventHandlers {
  export const registry = new Handler.Registry()
    .handle(PapercutContract.syncResult)
    .handle(ReplicacheContract.notification)
    .final();

  export type Record = typeof registry.record;
}
