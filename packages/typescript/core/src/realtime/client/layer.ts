import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import * as Socket from "effect/unstable/socket/Socket";

import { Realtime } from ".";
import { Api } from "../../api";
import { Events } from "../../handlers/events";
import { NetworkMonitor } from "../../utils/client/network-monitor";
import { RealtimeContract } from "../contract";
import { Subscriptions } from "./subscriptions";

export type ServiceShape = Effect.Success<ReturnType<typeof makeService>>;

export const makeService = Effect.fn(
  function* (baseUrls: { api: URL; realtime: URL }) {
    const api = yield* HttpClient.HttpClient.pipe(
      Effect.flatMap((httpClient) =>
        HttpApiClient.group(Api, { baseUrl: baseUrls.api, httpClient, group: "realtime" }),
      ),
    );

    const authProtocol = yield* api
      .getAuthorization({ payload: undefined })
      .pipe(Effect.flatMap(Schema.encodeEffect(RealtimeContract.WebSocketAuthorizationProtocol)));

    const socket = yield* Socket.makeWebSocket(new URL("/event/realtime", baseUrls.realtime).href, {
      protocols: ["aws-appsync-event-ws", authProtocol],
    });
    const write = yield* socket.writer;

    const subscriptions = yield* Subscriptions;

    // oxlint-disable-next-line no-empty-function
    yield* socket.run(() => {}, {
      onOpen: RealtimeContract.ConnectionInit.makeEffect().pipe(
        Effect.flatMap(
          Schema.encodeEffect(RealtimeContract.ConnectionInit.pipe(Schema.fromJsonString)),
        ),
        Effect.flatMap(write),
        Effect.catch(Effect.log),
      ),
    });

    const messageStream = yield* Stream.callback<
      RealtimeContract.Message,
      Schema.SchemaError | Socket.SocketError
    >((queue) =>
      socket.runString((string) =>
        Effect.succeed(string).pipe(
          Effect.flatMap(Schema.decodeEffect(RealtimeContract.Message)),
          Effect.flatMap((message) => Queue.offer(queue, message)),
        ),
      ),
    ).pipe(Stream.share({ capacity: 32, strategy: "suspend" }));

    const connectionAckStream = messageStream.pipe(
      Stream.filter((message) => message.type === "connection_ack"),
      Stream.timeoutOrElse({
        duration: Duration.seconds(5),
        orElse: () => Stream.fail(new Cause.TimeoutError("Connection timed out")),
      }),
      Stream.tap(
        Effect.fn(function* (ack) {
          yield* Effect.all(
            Record.collect(Events.registry.record, (name) =>
              subscriptions.add({
                name,
                getAuthorization: (channel) => api.getAuthorization({ payload: { channel } }),
                send: write,
              }),
            ),
            { discard: true },
          );

          yield* messageStream.pipe(
            Stream.filter((message) => message.type === "ka"),
            Stream.timeoutOrElse({
              duration: ack.connectionTimeout,
              orElse: () => Stream.fail(new Cause.TimeoutError("Keep-alive timed out")),
            }),
            Stream.runDrain,
          );
        }),
      ),
    );

    const subscribeSuccessStream = messageStream.pipe(
      Stream.filter((message) => message.type === "subscribe_success"),
      Stream.tap((success) => subscriptions.confirm(success.id)),
    );

    const dataStream = messageStream.pipe(
      Stream.filter((message) => message.type === "data"),
      Stream.tap(subscriptions.handleEvent),
    );

    const stream = connectionAckStream.pipe(
      Stream.merge(subscribeSuccessStream),
      Stream.merge(dataStream),
    );

    return { socket, stream } as const;
  },
  (effect) => NetworkMonitor.use((monitor) => monitor.onlineLatch.whenOpen(effect)),
);

export const layer = (...args: Parameters<typeof makeService>) =>
  makeService(...args).pipe(Layer.effect(Realtime));
