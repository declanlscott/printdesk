import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiError from "@effect/platform/HttpApiError";
import { ApiContract } from "@printdesk/core/api/contract";
import { Realtime } from "@printdesk/core/realtime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { actorLayer } from "../middleware/actor";
import { realtimeSubscriberCredentialsIdentityLayer } from "../middleware/aws";

export const realtimeLayer = HttpApiBuilder.group(
  ApiContract.Application,
  "realtime",
  (handlers) =>
    handlers
      .handle("getAuthorization", ({ payload }) =>
        Realtime.Realtime.getAuthorization(payload.channel).pipe(
          Effect.mapError(() => new HttpApiError.InternalServerError()),
        ),
      )
      .handle("getUrl", () =>
        Realtime.Realtime.url.pipe(
          Effect.mapError(() => new HttpApiError.InternalServerError()),
        ),
      ),
).pipe(
  Layer.provide(Realtime.Realtime.Default),
  Layer.provide(realtimeSubscriberCredentialsIdentityLayer),
  Layer.provide(actorLayer),
);
