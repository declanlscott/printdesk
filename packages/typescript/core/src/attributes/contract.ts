import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { EntityId, Separator, ShortId, TenantId } from "../utils";
import { Constants } from "../utils/constants";

export namespace AttributesContract {
  export const Client = Schema.Literal(Constants.KEY_LITERALS.CLIENT);
  export const Infra = Schema.Literal(Constants.KEY_LITERALS.INFRA);
  export const Input = Schema.Literal(Constants.KEY_LITERALS.INPUT);
  export const Ip = Schema.Literal(Constants.KEY_LITERALS.IP);
  export const Tenant = Schema.Literal(Constants.KEY_LITERALS.TENANT);
  export const Order = Schema.Literal(Constants.KEY_LITERALS.ORDER);
  export const Output = Schema.Literal(Constants.KEY_LITERALS.OUTPUT);
  export const Room = Schema.Literal(Constants.KEY_LITERALS.ROOM);
  export const User = Schema.Literal(Constants.KEY_LITERALS.USER);

  export const InfraInput = Schema.TemplateLiteralParser([Infra, Separator, Input, Separator]);
  export const InfraOutput = Schema.TemplateLiteralParser([Infra, Separator, Output, Separator]);

  export const IpFromString = Schema.TemplateLiteralParser([
    Ip,
    Separator,
    Schema.String,
    Separator,
  ]).pipe(
    Schema.decodeTo(
      Schema.String,
      SchemaTransformation.transform({
        decode: ([, , ip]) => ip,
        encode: (ip) => [Ip.literal, Separator.literal, ip, Separator.literal],
      }),
    ),
  );

  export const OrderShortIdFromString = Schema.TemplateLiteralParser([
    Order,
    Separator,
    ShortId,
    Separator,
  ]).pipe(
    Schema.decodeTo(
      ShortId,
      SchemaTransformation.transform({
        decode: ([, , shortId]) => Number(shortId),
        encode: (shortId) => [
          Order.literal,
          Separator.literal,
          ShortId.make(shortId),
          Separator.literal,
        ],
      }),
    ),
  );

  export const TenantIdFromString = Schema.TemplateLiteralParser([
    Tenant,
    Separator,
    TenantId,
    Separator,
  ]).pipe(
    Schema.decodeTo(
      TenantId,
      SchemaTransformation.transform({
        decode: ([, , tenantId]) => String(tenantId),
        encode: (tenantId) => [
          Tenant.literal,
          Separator.literal,
          TenantId.make(tenantId),
          Separator.literal,
        ],
      }),
    ),
  );

  export class TenantClientId extends Schema.Class<TenantClientId>("TenantClientId")({
    tenantId: TenantId,
    clientId: EntityId,
  }) {}
  export const TenantClientIdFromString = Schema.TemplateLiteralParser([
    Tenant,
    Separator,
    TenantId,
    Separator,
    Client,
    Separator,
    EntityId,
    Separator,
  ]).pipe(
    Schema.decodeTo(
      TenantClientId,
      SchemaTransformation.transform({
        decode: ([, , tenantId, , , clientId]) => ({
          tenantId: String(tenantId),
          clientId: String(clientId),
        }),
        encode: ({ tenantId, clientId }) => [
          Tenant.literal,
          Separator.literal,
          TenantId.make(tenantId),
          Separator.literal,
          Client.literal,
          Separator.literal,
          EntityId.make(clientId),
          Separator.literal,
        ],
      }),
    ),
  );

  export class TenantRoomId extends Schema.Class<TenantRoomId>("TenantIdRoomId")({
    tenantId: TenantId,
    roomId: EntityId,
  }) {}
  export const TenantRoomIdFromString = Schema.TemplateLiteralParser([
    Tenant,
    Separator,
    TenantId,
    Separator,
    Room,
    Separator,
    EntityId,
    Separator,
  ]).pipe(
    Schema.decodeTo(
      TenantRoomId,
      SchemaTransformation.transform({
        decode: ([, , tenantId, , , roomId]) => ({
          tenantId: String(tenantId),
          roomId: String(roomId),
        }),
        encode: ({ tenantId, roomId }) => [
          Tenant.literal,
          Separator.literal,
          TenantId.make(tenantId),
          Separator.literal,
          Room.literal,
          Separator.literal,
          EntityId.make(roomId),
          Separator.literal,
        ],
      }),
    ),
  );

  export class TenantUserId extends Schema.Class<TenantUserId>("TenantUserId")({
    tenantId: TenantId,
    userId: EntityId,
  }) {}
  export const TenantUserIdFromString = Schema.TemplateLiteralParser([
    Tenant,
    Separator,
    TenantId,
    Separator,
    User,
    Separator,
    EntityId,
    Separator,
  ]).pipe(
    Schema.decodeTo(
      TenantUserId,
      SchemaTransformation.transform({
        decode: ([, , tenantId, , , userId]) => ({
          tenantId: String(tenantId),
          userId: String(userId),
        }),
        encode: ({ tenantId, userId }) => [
          Tenant.literal,
          Separator.literal,
          TenantId.make(tenantId),
          Separator.literal,
          User.literal,
          Separator.literal,
          EntityId.make(userId),
          Separator.literal,
        ],
      }),
    ),
  );
}
