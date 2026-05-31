import * as BrowserCrypto from "@effect/platform-browser/BrowserCrypto";
import { Actor } from "@printdesk/core/actors";
import * as EventsDispatcher from "@printdesk/core/events/client/dispatcher/layer";
import * as PapercutEvents from "@printdesk/core/papercut/client/events/layer";
import * as PoliciesDispatcher from "@printdesk/core/policies/client/dispatcher/layer";
import * as Realtime from "@printdesk/core/realtime/client/layer";
import * as Subscriptions from "@printdesk/core/realtime/client/subscriptions/layer";
import * as ReplicacheEvents from "@printdesk/core/replicache/client/events/layer";
import * as Replicache from "@printdesk/core/replicache/client/layer";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Redacted from "effect/Redacted";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as Socket from "effect/unstable/socket/Socket";

import { actorAtom } from "./actor";
import { atomRegistryLayer } from "./atom";
import { networkMonitorLayer } from "./network";
import { replicacheLayer } from "./replicache";
import { ViteResource } from "./sst";

export const realtimeRuntime = Layer.mergeAll(
  networkMonitorLayer,
  FetchHttpClient.layer,
  Socket.layerWebSocketConstructorGlobal,
  Subscriptions.layer.pipe(
    Layer.provide([BrowserCrypto.layer, Path.layer, EventsDispatcher.layer]),
    Layer.provide([PapercutEvents.layer, ReplicacheEvents.layer]),
    Layer.provide([PoliciesDispatcher.layer, replicacheLayer]),
    Layer.provide([Replicache.policiesLayer, atomRegistryLayer]),
  ),
).pipe(Atom.runtime);

export const realtimeAtom = realtimeRuntime.atom((get) =>
  ViteResource.atom.pipe(
    get.result,
    Effect.map(Struct.get("Hostnames")),
    Effect.map(Redacted.value),
    Effect.flatMap(({ api, realtime }) =>
      Realtime.makeService({
        api: new URL(`https://${api}`),
        realtime: new URL(`wss://${realtime}`),
      }),
    ),
    Effect.scoped,
    Effect.map(Struct.get("stream")),
    Stream.unwrap,
    Stream.scoped,
    Stream.provideService(Actor, Actor.of(get(actorAtom))),
  ),
);
