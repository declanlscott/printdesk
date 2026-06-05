import { Realtime } from "@printdesk/core/realtime/client";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as Socket from "effect/unstable/socket/Socket";

import { ViteResource } from "../sst";

export const realtimeRuntime = Layer.mergeAll(
  FetchHttpClient.layer,
  Socket.layerWebSocketConstructorGlobal,
).pipe(Atom.runtime);

export const realtimeAtom = realtimeRuntime
  .atom((get) =>
    ViteResource.atom.pipe(
      get.result,
      Effect.map(Struct.get("Hostnames")),
      Effect.map(Redacted.value),
      Effect.flatMap(({ api, realtime }) =>
        Realtime.make({
          apiBaseUrl: new URL(`https://${api}`),
          realtimeBaseUrl: new URL(`wss://${realtime}`),
        }),
      ),
    ),
  )
  .pipe(Atom.keepAlive);
