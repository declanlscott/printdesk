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

export const replicacheLayer = HttpApiBuilder.group(
  ApiContract.Application,
  "replicache",
  (handlers) =>
    handlers
      .handle("pull", ({ payload }) =>
        Effect.succeed(payload).pipe(
          Effect.flatMap(Schema.decode(ReplicachePullerContract.Request)),
          Effect.catchTag("ParseError", (e) =>
            HttpApiError.HttpApiDecodeError.refailParseError(e),
          ),
          Effect.flatMap(ReplicachePuller.pull),
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
      .handle("push", ({ payload }) =>
        Effect.succeed(payload).pipe(
          Effect.flatMap(Schema.decode(ReplicachePusherContract.Request)),
          Effect.catchTag("ParseError", (e) =>
            HttpApiError.HttpApiDecodeError.refailParseError(e),
          ),
          Effect.flatMap(ReplicachePusher.push),
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
).pipe(
  Layer.provide(ReplicachePuller.Default),
  Layer.provide(ReplicachePusher.Default),
  Layer.provide(tenantRealtimePublisherCredentialsIdentityLayer),
  Layer.provide(actorLayer),
);
