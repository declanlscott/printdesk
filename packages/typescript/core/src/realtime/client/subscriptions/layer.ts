import * as Cause from "effect/Cause";
import * as Crypto from "effect/Crypto";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PubSub from "effect/PubSub";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as SynchronizedRef from "effect/SynchronizedRef";

import { Subscriptions } from ".";
import { Actor } from "../../../actors";
import { EventsDispatcher } from "../../../events/client/dispatcher";
import { RealtimeContract } from "../../contract";

import type { Events } from "../../../handlers/events";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const mapRef = yield* SynchronizedRef.make(
    HashMap.empty<RealtimeContract.SubscriptionId, keyof Events.Record>(),
  );
  const successPubSub = yield* PubSub.unbounded<RealtimeContract.SubscriptionId>();

  const crypto = yield* Crypto.Crypto;
  const path = yield* Path.Path;
  const eventsDispatcher = yield* EventsDispatcher;

  const add = Effect.fn(
    function* <TAuthorizationError, TAuthorizationServices, TSendError, TSendServices>({
      name,
      getAuthorization,
      send,
    }: {
      name: keyof Events.Record;
      getAuthorization: (
        channel: RealtimeContract.Channel,
      ) => Effect.Effect<
        RealtimeContract.Authorization,
        TAuthorizationError,
        TAuthorizationServices
      >;
      send: (message: string) => Effect.Effect<void, TSendError, TSendServices>;
    }) {
      const id = yield* crypto.randomUUIDv4.pipe(
        Effect.flatMap(RealtimeContract.SubscriptionId.makeEffect),
      );

      const channel = yield* Actor.pipe(
        Effect.flatMap(Struct.get("assertUser")),
        Effect.map(({ tenantId }) => `/${path.join(tenantId, name)}` as const),
      );

      const authorization = yield* getAuthorization(channel);

      yield* mapRef.pipe(SynchronizedRef.update(HashMap.set(id, name)));

      yield* RealtimeContract.Subscribe.makeEffect({ id, channel, authorization }).pipe(
        Effect.flatMap(Schema.encodeEffect(RealtimeContract.Subscribe.pipe(Schema.fromJsonString))),
        Effect.flatMap(send),
      );

      yield* Stream.fromPubSub(successPubSub).pipe(
        Stream.filter((successId) => successId === id),
        Stream.take(1),
        Stream.timeoutOrElse({
          duration: Duration.seconds(5),
          orElse: () => Stream.fail(new Cause.TimeoutError("Subscription timed out")),
        }),
        Stream.onEnd(
          Effect.addFinalizer(() =>
            RealtimeContract.Unsubscribe.makeEffect({ id }).pipe(
              Effect.flatMap(
                Schema.encodeEffect(RealtimeContract.Unsubscribe.pipe(Schema.fromJsonString)),
              ),
              Effect.flatMap(send),
              Effect.catch(Effect.log),
            ),
          ),
        ),
        Stream.runDrain,
      );
    },
    (effect) =>
      effect.pipe(
        Effect.retry({ schedule: Schedule.spaced(Duration.seconds(1)).pipe(Schedule.jittered) }),
      ),
  );

  const confirm = (successId: RealtimeContract.SubscriptionId) =>
    successPubSub.pipe(PubSub.publish(successId));

  const handleEvent = Effect.fn(function* (data: RealtimeContract.Data) {
    const name = yield* mapRef.pipe(SynchronizedRef.get, Effect.map(HashMap.get(data.id)));
    if (Option.isNone(name)) return;

    yield* eventsDispatcher.dispatch(name.value, data.event);
  });

  return { add, confirm, handleEvent } as const;
});

export const layer = makeService.pipe(Layer.effect(Subscriptions));
