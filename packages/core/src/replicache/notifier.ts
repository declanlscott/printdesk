import * as Chunk from "effect/Chunk";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Struct from "effect/Struct";

import { Database } from "../database";
import { Realtime } from "../realtime";
import { RealtimeContract } from "../realtime/contract";

import type * as Array from "effect/Array";
import type { Events } from "../events";

class NotifyError extends Data.TaggedError("NotifyError")<{
  readonly cause: unknown;
}> {}

interface Notify extends Request.Request<void, NotifyError> {
  readonly _tag: "Notify";
  readonly notification: Events.ReplicacheNotification;
}

const Notify = Request.tagged<Notify>("Notify");

export class ReplicacheNotifier extends Effect.Service<ReplicacheNotifier>()(
  "@printdesk/core/replicache/ReplicacheNotifier",
  {
    dependencies: [
      Realtime.Realtime.Default,
      Database.TransactionManager.Default,
    ],
    effect: (clientGroupId: Events.ReplicacheNotification["clientGroupId"]) =>
      Effect.gen(function* () {
        const realtime = yield* Realtime.Realtime;
        const db = yield* Database.TransactionManager;

        const resolver = RequestResolver.makeBatched(
          Effect.fn("ReplicacheNotifier.batchedRun")(
            (requests: Array.NonEmptyArray<Notify>) =>
              realtime
                .publish(
                  RealtimeContract.makeChannel("/replicache"),
                  Chunk.fromIterable(requests).pipe(
                    Chunk.map(Struct.get("notification")),
                  ),
                )
                .pipe(
                  Effect.andThen((success) =>
                    Effect.forEach(
                      requests,
                      Request.completeEffect(Effect.succeed(success)),
                    ),
                  ),
                  Effect.catchAll((error) =>
                    Effect.forEach(
                      requests,
                      Request.completeEffect(
                        Effect.fail(new NotifyError({ cause: error })),
                      ),
                    ),
                  ),
                ),
          ),
        );

        const notify = Effect.fn("ReplicacheNotifier.notify")(
          (data: Events.ReplicacheNotification["data"]) =>
            db.afterTransaction(
              Effect.request(
                Notify({ notification: { clientGroupId, data } }),
                resolver,
              ).pipe(
                Effect.catchTag("NotifyError", (error) =>
                  Effect.logError(
                    "[ReplicacheNotifier]: Replicache notification failed.",
                    error.cause,
                  ),
                ),
              ),
            ),
        );

        return { notify } as const;
      }),
  },
) {}
