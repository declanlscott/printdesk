import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

import { EntityId, Separator, ShortId, TenantId } from "../utils";
import { Constants } from "../utils/constants";

export namespace AttributesContract {
  export const Client = Schema.Literal(Constants.KEY_LITERALS.CLIENT);
  export const Deployment = Schema.Literal(Constants.KEY_LITERALS.DEPLOYMENT);
  export const Infra = Schema.Literal(Constants.KEY_LITERALS.INFRA);
  export const Input = Schema.Literal(Constants.KEY_LITERALS.INPUT);
  export const Ip = Schema.Literal(Constants.KEY_LITERALS.IP);
  export const Tenant = Schema.Literal(Constants.KEY_LITERALS.TENANT);
  export const Order = Schema.Literal(Constants.KEY_LITERALS.ORDER);
  export const Output = Schema.Literal(Constants.KEY_LITERALS.OUTPUT);
  export const Room = Schema.Literal(Constants.KEY_LITERALS.ROOM);
  export const User = Schema.Literal(Constants.KEY_LITERALS.USER);

  export const InfraInput = Schema.TemplateLiteralParser([Infra, Separator, Input]).pipe(
    Schema.withConstructorDefault(
      Effect.succeed([Infra.literal, Separator.literal, Input.literal]),
    ),
  );
  export const InfraOutput = Schema.TemplateLiteralParser([Infra, Separator, Output]);

  export const IpFromString = Schema.TemplateLiteralParser([Ip, Separator, Schema.String]).pipe(
    Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transform(([, , ip]) => ip),
      encode: SchemaGetter.transform((ip) => [Ip.literal, Separator.literal, ip]),
    }),
  );

  export const OrderShortIdFromString = Schema.TemplateLiteralParser([
    Order,
    Separator,
    ShortId,
  ]).pipe(
    Schema.decodeTo(ShortId, {
      decode: SchemaGetter.transform(([, , shortId]) => Number(shortId)),
      encode: SchemaGetter.transform((shortId) => [
        Order.literal,
        Separator.literal,
        ShortId.make(shortId),
      ]),
    }),
  );

  export const TenantIdFromString = Schema.TemplateLiteralParser([
    Tenant,
    Separator,
    TenantId,
  ]).pipe(
    Schema.decodeTo(TenantId, {
      decode: SchemaGetter.transform(([, , tenantId]) => String(tenantId)),
      encode: SchemaGetter.transform((tenantId) => [
        Tenant.literal,
        Separator.literal,
        TenantId.make(tenantId),
      ]),
    }),
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
  ]).pipe(
    Schema.decodeTo(TenantClientId, {
      decode: SchemaGetter.transform(([, , tenantId, , , , clientId]) => ({
        tenantId: String(tenantId),
        clientId: String(clientId),
      })),
      encode: SchemaGetter.transform(({ tenantId, clientId }) => [
        Tenant.literal,
        Separator.literal,
        TenantId.make(tenantId),
        Separator.literal,
        Client.literal,
        Separator.literal,
        EntityId.make(clientId),
      ]),
    }),
  );

  export class TenantDeploymentId extends Schema.Class<TenantDeploymentId>("TenantDeploymentId")({
    tenantId: TenantId,
    deploymentId: EntityId,
  }) {}
  export const TenantDeploymentIdFromString = Schema.TemplateLiteralParser([
    Tenant,
    Separator,
    TenantId,
    Separator,
    Deployment,
    Separator,
    EntityId,
  ]).pipe(
    Schema.decodeTo(TenantDeploymentId, {
      decode: SchemaGetter.transform(([, , tenantId, , , , deploymentId]) => ({
        tenantId: String(tenantId),
        deploymentId: String(deploymentId),
      })),
      encode: SchemaGetter.transform(({ tenantId, deploymentId }) => [
        Tenant.literal,
        Separator.literal,
        TenantId.make(tenantId),
        Separator.literal,
        Deployment.literal,
        Separator.literal,
        EntityId.make(deploymentId),
      ]),
    }),
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
  ]).pipe(
    Schema.decodeTo(TenantRoomId, {
      decode: SchemaGetter.transform(([, , tenantId, , , , roomId]) => ({
        tenantId: String(tenantId),
        roomId: String(roomId),
      })),
      encode: SchemaGetter.transform(({ tenantId, roomId }) => [
        Tenant.literal,
        Separator.literal,
        TenantId.make(tenantId),
        Separator.literal,
        Room.literal,
        Separator.literal,
        EntityId.make(roomId),
      ]),
    }),
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
  ]).pipe(
    Schema.decodeTo(TenantUserId, {
      decode: SchemaGetter.transform(([, , tenantId, , , , userId]) => ({
        tenantId: String(tenantId),
        userId: String(userId),
      })),
      encode: SchemaGetter.transform(({ tenantId, userId }) => [
        Tenant.literal,
        Separator.literal,
        TenantId.make(tenantId),
        Separator.literal,
        User.literal,
        Separator.literal,
        EntityId.make(userId),
      ]),
    }),
  );
}
