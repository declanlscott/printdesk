import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { Bff } from "../contract";
import { ViteResource } from "../lib/sst";

export const baseSpaGroupLayer = HttpApiBuilder.group(
  Bff,
  "spa",
  Effect.fn(function* (handlers) {
    const assets = yield* ViteResource.useSync(Struct.get("ASSETS")).pipe(
      Effect.map(Redacted.value),
    );

    return handlers.handle("assets", ({ request }) =>
      HttpServerRequest.toWeb(request).pipe(
        Effect.flatMap((request) => Effect.tryPromise(() => assets.fetch(request))),
        Effect.map(HttpServerResponse.fromWeb),
        Effect.orDie,
      ),
    );
  }),
);

export const spaGroupLayer = baseSpaGroupLayer.pipe(Layer.provide(ViteResource.layer));
