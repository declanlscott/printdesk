import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Events } from "../events";

import type { StartsWith } from "../utils";

export namespace RealtimeContract {
  const success = <TKind extends string>(kind: TKind) =>
    Schema.Struct({
      type: Schema.tag(`${kind}_success`),
      id: Schema.String,
    });

  const error = <TKind extends string>(kind: TKind) =>
    Schema.Struct({
      type: Schema.tag(`${kind}_error`),
      id: Schema.String,
      errors: Schema.Struct({
        errorType: Schema.String,
        message: Schema.String,
      }).pipe(Schema.Array),
    });

  const result = <TKind extends string>(kind: TKind) =>
    [success(kind), error(kind)] as const;

  export class ConnectionInit extends Schema.Class<ConnectionInit>(
    "ConnectionInit",
  )({ type: Schema.tag("connection_init") }) {}

  export class ConnectionAck extends Schema.Class<ConnectionAck>(
    "ConnectionAck",
  )({
    type: Schema.tag("connection_ack"),
    connectionTimeout: Schema.propertySignature(Schema.DurationFromMillis).pipe(
      Schema.fromKey("connectionTimeoutMs"),
    ),
  }) {}

  export const SubscriptionId = Schema.UUID.pipe(
    Schema.brand("SubscriptionId"),
  );
  export type SubscriptionId = typeof SubscriptionId.Type;
  export const Channel = Schema.String.pipe(
    Schema.startsWith("/"),
    Schema.brand("Channel"),
  );
  export type Channel<TChannel extends string> = typeof Channel.Type &
    StartsWith<"/", TChannel>;
  export const makeChannel = <TChannel extends string>(
    channel: StartsWith<"/", TChannel>,
  ) => Channel.make(channel) as Channel<TChannel>;

  export class Subscribe extends Schema.Class<Subscribe>("Subscribe")({
    type: Schema.tag("subscribe"),
    id: SubscriptionId,
    channel: Channel,
    authorization: Schema.Record({ key: Schema.String, value: Schema.String }),
  }) {}

  export class Data extends Schema.Class<Data>("Data")({
    type: Schema.tag("data"),
    id: SubscriptionId,
    event: Schema.Unknown,
  }) {}

  export class KeepAlive extends Schema.Class<KeepAlive>("KeepAlive")({
    type: Schema.tag("ka"),
  }) {}

  export class Unsubscribe extends Schema.Class<Unsubscribe>("Unsubscribe")({
    type: Schema.tag("unsubscribe"),
    id: SubscriptionId,
  }) {}

  export const Message = Schema.parseJson(
    Schema.Union(
      ConnectionAck,
      ...result("subscribe"),
      Data,
      error("broadcast"),
      KeepAlive,
      ...result("unsubscribe"),
    ),
  );

  export const Event = Events.Event.pipe(
    Effect.map((event) =>
      Schema.Struct({ type: Schema.tag("event"), id: SubscriptionId, event }),
    ),
  );
  export type Event = Effect.Effect.Success<typeof Event>["Type"];
}
