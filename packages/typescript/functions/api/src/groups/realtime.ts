import { Api } from "@printdesk/core/api";
import { Realtime } from "@printdesk/core/realtime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { appsyncSubscriberCredentialIdentityProviderMiddlewareLayer } from "../lib/aws";
import { realtimeLayer } from "../lib/realtime";

export const baseRealtimeGroupLayer = HttpApiBuilder.group(
  Api,
  "Realtime",
  Effect.fn(function* (handlers) {
    const realtime = yield* Realtime;

    return handlers.handle(
      "getAuthorization",
      Effect.fn("Api.Realtime.getAuthorization")(({ payload }) =>
        realtime.getAuthorization(payload).pipe(Effect.orDie),
      ),
    );
  }),
);

export const realtimeGroupLayer = baseRealtimeGroupLayer.pipe(
  Layer.provide([appsyncSubscriberCredentialIdentityProviderMiddlewareLayer, realtimeLayer]),
);
