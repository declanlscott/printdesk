import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiError from "@effect/platform/HttpApiError";
import { ApiContract } from "@printdesk/core/api/contract";
import {
  ReplicachePullerContract,
  ReplicachePusherContract,
} from "@printdesk/core/replicache/contracts";
import { ReplicachePuller } from "@printdesk/core/replicache/pull";
import { ReplicachePusher } from "@printdesk/core/replicache/push";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { actorLayer } from "../middleware/actor";
import { tenantRealtimePublisherCredentialsIdentityLayer } from "../middleware/aws";

export const replicacheLayer = ApiContract.Application.pipe(
  Effect.map((api) =>
    HttpApiBuilder.group(api, "replicache", (handlers) =>
      handlers
        .handle("pull", ({ payload: request }) =>
          ReplicachePuller.pull(request).pipe(
            Effect.catchTags({
              ClientStateNotFoundError: (e) => Effect.succeed(e.response),
              VersionNotSupportedError: (e) => Effect.succeed(e.response),
            }),
            Effect.flatMap(Schema.encode(ReplicachePullerContract.Response)),
            Effect.catchTag(
              "ParseError",
              () => new HttpApiError.InternalServerError(),
            ),
          ),
        )
        .handle("push", ({ payload: request }) =>
          ReplicachePusher.push(request).pipe(
            Effect.catchTags({
              ClientStateNotFoundError: (e) => Effect.succeed(e.response),
              VersionNotSupportedError: (e) => Effect.succeed(e.response),
            }),
            Effect.flatMap(Schema.encode(ReplicachePusherContract.Response)),
            Effect.catchTag(
              "ParseError",
              () => new HttpApiError.InternalServerError(),
            ),
          ),
        ),
    ),
  ),
  Layer.unwrapEffect,
  Layer.provide(ApiContract.Application.Default),
  Layer.provide(ReplicachePuller.Default),
  Layer.provide(ReplicachePusher.Default),
  Layer.provide(tenantRealtimePublisherCredentialsIdentityLayer),
  Layer.provide(actorLayer),
);
