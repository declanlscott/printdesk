import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ReplicacheNotifier } from ".";
import { Transaction } from "../../database/transaction";
import { RealtimeEventHandlers } from "../../handlers/realtime-events";
import { Realtime } from "../../realtime";
import { ReplicacheClientGroupId } from "../client-group-id";
import { ReplicacheContract } from "../contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const realtime = yield* Realtime;

  const notify = Effect.fn("ReplicacheNotifier.notify")(
    (data: ReplicacheContract.Notification["data"]) =>
      ReplicacheClientGroupId.useSync(
        (clientGroupId) => new ReplicacheContract.Notification({ clientGroupId, data }),
      ).pipe(
        Effect.flatMap((notification) =>
          RealtimeEventHandlers.registry
            .resolve("/replicache/notification")
            .pipe(Effect.map((handler) => handler.make(notification))),
        ),
        Effect.flatMap(realtime.publish),
      ),
  );

  const notifyAfterTransaction = Effect.fn("ReplicacheNotifier.notifyAfterTransaction")(
    (...args: Parameters<typeof notify>) =>
      Effect.context<Effect.Services<ReturnType<typeof notify>>>().pipe(
        Effect.flatMap((context) =>
          notify(...args).pipe(
            Effect.provideContext(context),
            Effect.catchCause((cause) =>
              Effect.logError("[ReplicacheNotifier]: Replicache notification failed:", cause),
            ),
            Transaction.after(),
          ),
        ),
      ),
  );

  const poke = RealtimeEventHandlers.registry.resolve("/replicache/poke").pipe(
    Effect.map((handler) => handler.make(undefined)),
    Effect.flatMap(realtime.publish),
    Effect.withSpan("ReplicacheNotifier.poke"),
  );

  const pokeAfterTransaction = Effect.context<Effect.Services<typeof poke>>().pipe(
    Effect.flatMap((context) =>
      poke.pipe(
        Effect.provideContext(context),
        Effect.catchCause((cause) =>
          Effect.logError("[ReplicacheNotifier]: Replicache poke failed:", cause),
        ),
        Transaction.after(),
      ),
    ),
    Effect.withSpan("ReplicacheNotifier.pokeAfterTransaction"),
  );

  return {
    notify,
    notifyAfterTransaction,
    poke,
    pokeAfterTransaction,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheNotifier));
