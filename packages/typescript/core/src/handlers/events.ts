import { PapercutContract } from "../papercut/contract";
import { ReplicacheContract } from "../replicache/contracts";
import { HandlersContract } from "./contract";

export namespace Events {
  export const registry = new HandlersContract.Registry()
    .handle(PapercutContract.syncResult)
    .handle(ReplicacheContract.notification)
    .final();

  export type Record = typeof registry.record;
}
