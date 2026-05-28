import * as Schema from "effect/Schema";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import { Events } from "../events";

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

  const result = <TKind extends string>(kind: TKind) => [success(kind), error(kind)] as const;

  export class ConnectionInit extends Schema.Class<ConnectionInit>("ConnectionInit")({
    type: Schema.tag("connection_init"),
  }) {}

  export const ConnectionAck = Schema.Struct({
    type: Schema.tag("connection_ack"),
    connectionTimeout: Schema.DurationFromMillis,
  }).pipe(Schema.encodeKeys({ connectionTimeout: "connectionTimeoutMs" }));

  export const SubscriptionId = Schema.String.pipe(
    Schema.check(Schema.isUUID()),
    Schema.brand("SubscriptionId"),
  );
  export type SubscriptionId = typeof SubscriptionId.Type;

  export const Channel = Schema.TemplateLiteral([Schema.Literal("/"), Schema.NonEmptyString]);
  export type Channel = typeof Channel.Type;

  export class Subscribe extends Schema.Class<Subscribe>("Subscribe")({
    type: Schema.tag("subscribe"),
    id: SubscriptionId,
    channel: Channel,
    authorization: Schema.Record(Schema.String, Schema.String),
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

  export const Message = Schema.Union([
    ConnectionAck,
    ...result("subscribe"),
    Data,
    error("broadcast"),
    KeepAlive,
    ...result("unsubscribe"),
  ]);

  export class Event extends Schema.Class<Event>("Event")({
    type: Schema.tag("event"),
    id: SubscriptionId,
    event: Events.Event,
  }) {}

  export class GetAuthorizationPayload extends Schema.Class<GetAuthorizationPayload>(
    "GetAuthorizationPayload",
  )({ channel: Channel.pipe(Schema.toEncoded) }) {}

  export const Authorization = Schema.Record(Schema.String, Schema.String);

  export const GetAuthorizationSuccess = Authorization.pipe(HttpApiSchema.status(200));
}
