import * as Array from "effect/Array";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as String from "effect/String";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import { Events } from "../handlers/events";

export namespace RealtimeContract {
  export const Authorization = Schema.Record(Schema.String, Schema.String);

  export const Event = Events.registry.Schema.mapMembers(
    Array.map((member) => member.fields.input),
  );
  export type Event = typeof Event.Type;

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
    authorization: Authorization,
  }) {}

  export class Data extends Schema.Class<Data>("Data")({
    type: Schema.tag("data"),
    id: SubscriptionId,
    event: Event,
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
  ]).pipe(Schema.fromJsonString);
  export type Message = typeof Message.Type;

  export const AuthorizationPayload = Schema.Struct({ channel: Channel }).pipe(Schema.optional);
  export type AuthorizationPayload = typeof AuthorizationPayload.Type;

  export const AuthorizationSuccess = Authorization.pipe(HttpApiSchema.status(200));

  const headerPrefix = "header-";
  const Base64Url = Schema.NonEmptyString.pipe(Schema.check(Schema.isBase64Url()));
  export const WebSocketAuthorizationProtocol = Authorization.pipe(
    Schema.fromJsonString,
    Schema.encodeTo(Base64Url, {
      encode: SchemaGetter.encodeBase64Url(),
      decode: SchemaGetter.decodeBase64UrlString(),
    }),
    Schema.encodeTo(Schema.TemplateLiteral([Schema.Literal(headerPrefix), Base64Url]), {
      encode: SchemaGetter.transform((base64Url) => `${headerPrefix}${base64Url}` as const),
      decode: SchemaGetter.transform(String.replace(headerPrefix, "")),
    }),
  );

  export class PublishPayload extends Schema.Class<PublishPayload>("PublishPayload")({
    channel: Channel,
    events: Event.pipe(Schema.Array),
  }) {}
}
