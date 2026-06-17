import { NetworkMonitor } from "@printdesk/core/network/client/monitor";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as Atom from "effect/unstable/reactivity/Atom";

export const networkMonitorAtom = Atom.make(NetworkMonitor.make).pipe(Atom.keepAlive);

export const onlineAtom = Atom.make((get) =>
  get.resultOnce(networkMonitorAtom).pipe(Effect.map(Struct.get("onlineChanges")), Stream.unwrap),
);
