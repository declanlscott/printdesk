import { Array, Data, Effect, Request, RequestResolver, Struct } from "effect";

import { Database } from "../database2";
import { Realtime } from "../realtime2";

import type { Events } from "../events2";

class NotifyError extends Data.TaggedError("NotifyError")<{ cause: unknown }> {}

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
            (requests: ReadonlyArray<Notify>) =>
              realtime
                .publish({
                  channel: "/replicache",
                  events: Array.map(requests, Struct.get("notification")),
                })
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
