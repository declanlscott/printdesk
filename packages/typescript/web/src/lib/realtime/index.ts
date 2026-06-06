import { Realtime } from "@printdesk/core/realtime/client";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as Socket from "effect/unstable/socket/Socket";

import { networkMonitorAtom } from "../network";
import { ViteResource } from "../sst";

export const realtimeRuntime = Layer.mergeAll(
  FetchHttpClient.layer,
  Socket.layerWebSocketConstructorGlobal,
).pipe(Atom.runtime);

export const realtimeAtom = realtimeRuntime
  .atom(
    Effect.fn(function* (get) {
      const hostnames = yield* get
        .resultOnce(ViteResource.atom)
        .pipe(Effect.map(Struct.get("Hostnames")), Effect.map(Redacted.value));
      const networkMonitor = yield* get.resultOnce(networkMonitorAtom);

      return yield* Realtime.make({
        baseUrls: {
          api: new URL(`https://${hostnames.api}`),
          realtime: new URL(`wss://${hostnames.realtime}`),
        },
        networkMonitor,
      });
    }),
  )
  .pipe(Atom.keepAlive);
