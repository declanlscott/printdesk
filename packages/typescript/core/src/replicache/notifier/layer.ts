import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Struct from "effect/Struct";

import { ReplicacheNotifier, ReplicacheNotifyError, ReplicacheNotifyRequest } from ".";
import { Actor } from "../../actors";
import { AwsCredentialIdentity } from "../../aws/credential-identity";
import { Database } from "../../database";
import { Realtime } from "../../realtime";
import { ReplicacheClientGroupId } from "../client-group-id";
import { ReplicacheContract } from "../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const realtime = yield* Realtime;
  const db = yield* Database;

  const resolver = Effect.context<Actor | AwsCredentialIdentity>().pipe(
    Effect.map((context) =>
      RequestResolver.make<ReplicacheNotifyRequest>((entries) =>
        realtime
          .publish(
            "/replicache",
            Chunk.fromIterable(entries).pipe(Chunk.map(Struct.get("request"))),
          )
          .pipe(
            Effect.provideContext(context),
            Effect.andThen((success) => Effect.forEach(entries, Request.succeed(success))),
            Effect.catchCause((cause) =>
              Effect.forEach(entries, Request.fail(new ReplicacheNotifyError({ cause }))),
            ),
          ),
      ).pipe(RequestResolver.withSpan("ReplicacheNotifier.resolver")),
    ),
  );

  const notify = Effect.fn("ReplicacheNotifier.notify")(
    (data: ReplicacheContract.Notification["data"]) =>
      Effect.context<ReplicacheClientGroupId | Actor | AwsCredentialIdentity>().pipe(
        Effect.flatMap((context) =>
          Effect.request(
            new ReplicacheNotifyRequest(
              new ReplicacheContract.Notification({
                clientGroupId: context.pipe(Context.get(ReplicacheClientGroupId)),
                data,
              }),
            ),
            resolver,
          ).pipe(
            Effect.catchCause((cause) =>
              Effect.logError("[ReplicacheNotifier]: Replicache notification failed:", cause),
            ),
            Effect.provideContext(context.pipe(Context.pick(Actor, AwsCredentialIdentity))),
            db.afterTransaction,
          ),
        ),
      ),
  );

  return { notify } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheNotifier));
