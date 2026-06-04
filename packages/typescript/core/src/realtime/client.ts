import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Channel from "effect/Channel";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Deferred from "effect/Deferred";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as PubSub from "effect/PubSub";
import * as Pull from "effect/Pull";
import * as Result from "effect/Result";
import * as Scheduler from "effect/Scheduler";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import * as Socket from "effect/unstable/socket/Socket";

import { Api } from "../api";
import { NetworkMonitor } from "../utils/client/network-monitor";
import { RealtimeContract } from "./contract";

import type { Handler } from "../handlers";

export namespace Realtime {
  const timeoutDuration = Duration.seconds(5);

  export interface Options {
    readonly apiBaseUrl: URL;
    readonly realtimeBaseUrl: URL;
  }

  export const make = Effect.fn(function* (opts: Options) {
    const { apiBaseUrl, realtimeBaseUrl } = opts;

    const api = yield* HttpClient.HttpClient.pipe(
      Effect.flatMap((httpClient) =>
        HttpApiClient.group(Api, { baseUrl: apiBaseUrl, httpClient, group: "realtime" }),
      ),
    );

    const authProtocol = yield* api
      .getAuthorization({ payload: undefined })
      .pipe(Effect.flatMap(Schema.encodeEffect(RealtimeContract.WebSocketAuthorizationProtocol)));

    const socket = yield* Socket.makeWebSocket(new URL("/event/realtime", realtimeBaseUrl).href, {
      protocols: ["aws-appsync-event-ws", authProtocol],
    });
    const write = yield* socket.writer;

    const pubSub = yield* PubSub.unbounded<RealtimeContract.Message>();

    yield* socket.runString(
      (string) =>
        Effect.succeed(string).pipe(
          Effect.flatMap(Schema.decodeEffect(RealtimeContract.Message)),
          Effect.flatMap((message) => pubSub.pipe(PubSub.publish(message))),
        ),
      {
        onOpen: RealtimeContract.ConnectionInit.makeEffect().pipe(
          Effect.flatMap(
            Schema.encodeEffect(RealtimeContract.ConnectionInit.pipe(Schema.fromJsonString)),
          ),
          Effect.flatMap(write),
          Effect.catch(Effect.log),
        ),
      },
    );

    const stream = yield* pubSub.pipe(
      Stream.fromPubSub,
      Stream.share({ capacity: 32, strategy: "suspend" }),
    );

    const connection = yield* Deferred.make<RealtimeContract.ConnectionAck, Cause.TimeoutError>();
    const disconnection = yield* Deferred.make<never, Cause.TimeoutError>();

    yield* stream.pipe(
      Stream.filter((message) => message.type === "connection_ack"),
      Stream.take(1),
      Stream.timeoutOrElse({
        duration: timeoutDuration,
        orElse: () => Stream.fail(new Cause.TimeoutError("Connection timed out")),
      }),
      Stream.tapBoth({
        onElement: (ack) => connection.pipe(Deferred.succeed(ack)),
        onError: (cause) => connection.pipe(Deferred.fail(cause)),
      }),
      Stream.tap((ack) =>
        stream.pipe(
          Stream.filter((message) => message.type === "ka"),
          Stream.timeoutOrElse({
            duration: ack.connectionTimeout,
            orElse: () => Stream.fail(new Cause.TimeoutError("Keep-alive timed out")),
          }),
          Stream.runDrain,
        ),
      ),
      Stream.runDrain,
      Effect.tapError((error) => disconnection.pipe(Deferred.fail(error))),
      Effect.forkScoped,
    );

    return {
      api,
      socket,
      pubSub,
      stream,
      connection,
      disconnection,
    } as const;
  });

  export interface EventAtomOptions<
    THandler extends Handler.Handler,
    TRuntimeError,
    TRealtimeError,
    TNetworkMonitorError,
    TChannel extends RealtimeContract.Channel,
    TChannelError,
    TChannelServices,
    THandlerError,
    THandlerServices,
  > {
    readonly runtime: Atom.AtomRuntime<
      THandler["Input"]["DecodingServices"] | TChannelServices | THandlerServices | Crypto.Crypto,
      TRuntimeError
    >;
    readonly atoms: {
      readonly realtime: Atom.Atom<
        AsyncResult.AsyncResult<Effect.Success<ReturnType<typeof make>>, TRealtimeError>
      >;
      readonly networkMonitor: Atom.Atom<
        AsyncResult.AsyncResult<
          Effect.Success<ReturnType<typeof NetworkMonitor.make>>,
          TNetworkMonitorError
        >
      >;
    };
    readonly getChannel: (
      get: Atom.AtomContext,
      name: THandler["name"],
    ) => Effect.Effect<TChannel, TChannelError, TChannelServices>;
    readonly handler: (
      get: Atom.AtomContext,
      event: THandler["Input"]["Type"],
    ) => Effect.Effect<void, THandlerError, THandlerServices>;
  }

  export const makeEventAtom = <
    THandler extends Handler.Handler,
    TRuntimeError,
    TRealtimeError,
    TNetworkMonitorError,
    TChannel extends RealtimeContract.Channel,
    TChannelError,
    TChannelServices,
    THandlerError,
    THandlerServices,
  >(
    handler: THandler,
    opts: EventAtomOptions<
      THandler,
      TRuntimeError,
      TRealtimeError,
      TNetworkMonitorError,
      TChannel,
      TChannelError,
      TChannelServices,
      THandlerError,
      THandlerServices
    >,
  ) =>
    Atom.readable((get) => {
      const stream = Effect.gen(function* () {
        const crypto = yield* Crypto.Crypto;
        const realtime = yield* opts.atoms.realtime.pipe(get.result);
        const write = yield* realtime.socket.writer;

        yield* realtime.connection.pipe(Deferred.await);

        const id = yield* crypto.randomUUIDv4.pipe(
          Effect.flatMap(RealtimeContract.SubscriptionId.makeEffect),
        );

        const channel = yield* opts.getChannel(get, handler.name);

        const authorization = yield* realtime.api.getAuthorization({ payload: { channel } });

        yield* RealtimeContract.Subscribe.makeEffect({ id, channel, authorization }).pipe(
          Effect.flatMap(
            Schema.encodeEffect(RealtimeContract.Subscribe.pipe(Schema.fromJsonString)),
          ),
          Effect.flatMap(write),
        );

        yield* realtime.stream.pipe(
          Stream.filter((message) => message.type === "subscribe_success" && message.id === id),
          Stream.take(1),
          Stream.timeoutOrElse({
            duration: timeoutDuration,
            orElse: () => Stream.fail(new Cause.TimeoutError("Subscribe timed out")),
          }),
          Stream.runDrain,
        );

        yield* Effect.addFinalizer(() =>
          RealtimeContract.Unsubscribe.makeEffect({ id }).pipe(
            Effect.flatMap(
              Schema.encodeEffect(RealtimeContract.Unsubscribe.pipe(Schema.fromJsonString)),
            ),
            Effect.flatMap(write),
            Effect.flatMap(() =>
              realtime.stream.pipe(
                Stream.filter(
                  (message) => message.type === "unsubscribe_success" && message.id === id,
                ),
                Stream.take(1),
                Stream.timeoutOrElse({
                  duration: timeoutDuration,
                  orElse: () => Stream.fail(new Cause.TimeoutError("Unsubscribe timed out")),
                }),
                Stream.runDrain,
              ),
            ),
            Effect.catch(Effect.log),
          ),
        );

        return realtime.stream.pipe(
          Stream.filterMapEffect((message) =>
            message.type === "data" && message.id === id
              ? Effect.succeed(message.event).pipe(
                  Effect.flatMap(Schema.decodeUnknownEffect<THandler["Input"]>(handler.Input)),
                  Effect.map(Result.succeed),
                )
              : Result.failVoid.pipe(Effect.succeed),
          ),
          Stream.tap((event) => opts.handler(get, event)),
        );
      }).pipe((effect) =>
        opts.atoms.networkMonitor.pipe(
          get.result,
          Effect.flatMap((monitor) => effect.pipe(monitor.onlineLatch.whenOpen)),
          Stream.unwrap,
        ),
      );

      const getSelf = () =>
        get.self<
          AsyncResult.AsyncResult<
            Stream.Success<typeof stream>,
            Stream.Error<typeof stream> | Cause.NoSuchElementError
          >
        >();

      const previous = getSelf();

      const runtime = opts.runtime.pipe(get);
      if (!AsyncResult.isSuccess(runtime)) return AsyncResult.replacePrevious(runtime, previous);

      const runFork = runtime.value.pipe(
        Context.add(AtomRegistry.AtomRegistry, get.registry),
        Context.add(Scheduler.Scheduler, get.registry.scheduler),
        Effect.runForkWith,
      );

      const fiber = Effect.scopedWith((scope) =>
        Channel.toPullScoped(stream.channel, scope).pipe(
          Effect.flatMap((pull) =>
            Effect.whileLoop({
              while: Function.constTrue,
              body: () => pull,
              step: (events) =>
                AsyncResult.success(Array.lastNonEmpty(events), { waiting: true }).pipe(
                  get.setSelf,
                ),
            }),
          ),
        ),
      ).pipe(
        Effect.raceFirst(
          opts.atoms.realtime.pipe(
            get.result,
            Effect.map(Struct.get("disconnection")),
            Effect.flatMap(Deferred.await),
          ),
        ),
        Effect.catchCause((cause) =>
          Effect.sync(() =>
            cause.pipe(Pull.isDoneCause)
              ? getSelf().pipe(
                  Option.flatMap(AsyncResult.value),
                  Option.match({
                    onNone: () =>
                      AsyncResult.failWithPrevious(new Cause.NoSuchElementError(), {
                        previous: getSelf(),
                      }).pipe(get.setSelf),
                    onSome: (event) => get.setSelf(AsyncResult.success(event)),
                  }),
                )
              : AsyncResult.failureWithPrevious(cause as Cause.Cause<Stream.Error<typeof stream>>, {
                  previous: getSelf(),
                }).pipe(get.setSelf),
          ),
        ),
        runFork,
      );
      fiber.currentDispatcher?.flush();

      get.addFinalizer(fiber.interruptUnsafe);

      return previous.pipe(
        Option.match({
          onSome: (previous) => previous.pipe(Option.some, AsyncResult.waitingFrom),
          onNone: () =>
            AsyncResult.initial<Stream.Success<typeof stream>, Stream.Error<typeof stream>>().pipe(
              AsyncResult.waiting,
            ),
        }),
      );
    });
}
