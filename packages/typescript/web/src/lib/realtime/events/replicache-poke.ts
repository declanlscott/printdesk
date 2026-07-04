import { Realtime } from "@printdesk/core/realtime/client";
import * as Effect from "effect/Effect";
import * as Struct from "effect/Struct";
import * as Atom from "effect/unstable/reactivity/Atom";

import { realtimeEventAtomLayer } from ".";
import { realtimeAtom } from "..";
import { actorAtom } from "../../actor";
import { networkMonitorAtom } from "../../network";
import { replicacheAtom } from "../../replicache";

export const replicachePokeAtom = Realtime.makeEventAtom("/replicache/poke", {
  runtime: realtimeEventAtomLayer.pipe(Atom.runtime),
  atoms: {
    actor: actorAtom,
    realtime: realtimeAtom,
    networkMonitor: networkMonitorAtom,
  },
  handler: (get) => get.resultOnce(replicacheAtom).pipe(Effect.flatMap(Struct.get("pull"))),
});
