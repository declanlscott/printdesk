import { Handler } from ".";
import { PapercutMfContract } from "../papercut-mf/contract";
import { ReplicacheContract } from "../replicache/contracts";

export namespace RealtimeEventHandlers {
  export const registry = new Handler.Registry()
    .handle(PapercutMfContract.apiTunnel)
    .handle(ReplicacheContract.notification)
    .handle(ReplicacheContract.poke)
    .final();

  export type Record = typeof registry.record;
}
