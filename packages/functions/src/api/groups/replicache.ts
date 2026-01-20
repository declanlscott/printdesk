import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { ApiContract } from "@printdesk/core/api/contract";
import { ReplicachePuller } from "@printdesk/core/replicache/pull";
import { ReplicachePusher } from "@printdesk/core/replicache/push";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { actorLayer } from "../middleware/actor";
import { tenantRealtimePublisherCredentialsIdentityLayer } from "../middleware/aws";

export const replicacheLayer = HttpApiBuilder.group(
  ApiContract.Application,
  "replicache",
  (handlers) =>
    handlers
      .handle("pull", ({ payload: request }) =>
        ReplicachePuller.pull(request).pipe(
          Effect.catchTags({
            ClientStateNotFoundError: (e) => Effect.succeed(e.response),
            VersionNotSupportedError: (e) => Effect.succeed(e.response),
          }),
        ),
      )
      .handle("push", ({ payload: request }) =>
        ReplicachePusher.push(request).pipe(
          Effect.catchTags({
            ClientStateNotFoundError: (e) => Effect.succeed(e.response),
            VersionNotSupportedError: (e) => Effect.succeed(e.response),
          }),
        ),
      ),
).pipe(
  Layer.provide(ReplicachePuller.Default),
  Layer.provide(ReplicachePusher.Default),
  Layer.provide(tenantRealtimePublisherCredentialsIdentityLayer),
  Layer.provide(actorLayer),
);
