import { NetworkMonitor } from "@printdesk/core/utils/client/network-monitor";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as SubscriptionRef from "effect/SubscriptionRef";
import * as Atom from "effect/unstable/reactivity/Atom";

export const networkMonitorAtom = Atom.make(
  NetworkMonitor.make({
    initialOnline: globalThis.window.navigator.onLine,
    addEventListener: globalThis.window.addEventListener,
    removeEventListener: globalThis.window.removeEventListener,
  }),
);

export const networkMonitorLayer = Layer.effect(
  NetworkMonitor,
  networkMonitorAtom.pipe(Atom.getResult),
);

export const onlineAtom = Atom.make((get) =>
  networkMonitorAtom.pipe(
    get.result,
    Effect.map(Struct.get("onlineRef")),
    Effect.map(SubscriptionRef.changes),
    Stream.unwrap,
  ),
);
