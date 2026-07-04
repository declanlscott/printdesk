import { Handler } from ".";
import { ReplicacheContract } from "../replicache/contracts";

export namespace RealtimeEventHandlers {
  export const registry = new Handler.Registry()
    .handle(ReplicacheContract.notification)
    .handle(ReplicacheContract.poke)
    .final();

  export type Record = typeof registry.record;
}
