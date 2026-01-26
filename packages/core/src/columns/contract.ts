import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";

import { generateId, NanoId } from "../utils";
import { Constants } from "../utils/constants";

export namespace ColumnsContract {
  export const VarChar = Schema.Trim.pipe(
    Schema.maxLength(Constants.VARCHAR_LENGTH),
  );
  export type VarChar = typeof VarChar.Type;

  export const Timestamp = Schema.DateTimeUtc.pipe(
    Schema.optionalWith({ default: DateTime.unsafeNow }),
  );
  export const NullableTimestamp = Schema.DateTimeUtc.pipe(
    Schema.NullOr,
    Schema.optionalWith({ default: () => null }),
  );

  export class Timestamps extends Schema.Class<Timestamps>("Timestamps")({
    createdAt: Timestamp,
    updatedAt: Timestamp,
    deletedAt: NullableTimestamp,
  }) {}

  export const EntityId = NanoId.pipe(Schema.brand("EntityId"));
  export type EntityId = typeof EntityId.Type;
  export const NullableEntityId = EntityId.pipe(
    Schema.NullOr,
    Schema.optionalWith({ default: () => null }),
  );

  export const ShortId = Schema.Int.pipe(Schema.brand("ShortId"));
  export type ShortId = typeof ShortId.Type;
  export const NullableShortId = ShortId.pipe(
    Schema.NullOr,
    Schema.optionalWith({ default: () => null }),
  );

  export const TenantId = EntityId.pipe(Schema.brand("TenantId"));
  export type TenantId = typeof TenantId.Type;

  export class BaseEntity extends Timestamps.extend<BaseEntity>("BaseEntity")({
    id: EntityId.pipe(Schema.optionalWith({ default: generateId })),
    tenantId: TenantId,
  }) {}

  export const Version = Schema.NonNegativeInt.pipe(Schema.brand("Version"));
  export type Version = typeof Version.Type;
  export const NullableVersion = ColumnsContract.Version.pipe(
    Schema.NullOr,
    Schema.optionalWith({ default: () => null }),
  );

  export class TenantIdRoomIdKey extends Schema.Class<TenantIdRoomIdKey>(
    "TenantIdRoomIdKey",
  )({
    tenantId: TenantId,
    roomId: EntityId,
  }) {}

  export const TenantIdRoomIdKeyFromString = Schema.TemplateLiteralParser(
    Schema.Literal("TENANT"),
    Schema.Literal(Constants.SEPARATOR),
    TenantId,
    Schema.Literal(Constants.SEPARATOR),
    Schema.Literal("ROOM"),
    Schema.Literal(Constants.SEPARATOR),
    EntityId,
  ).pipe(
    Schema.transform(TenantIdRoomIdKey, {
      strict: true,
      decode: ([, , tenantId, , , roomId]) => ({ tenantId, roomId }),
      encode: ({ tenantId, roomId }) => [
        "TENANT",
        Constants.SEPARATOR,
        TenantId.make(tenantId),
        Constants.SEPARATOR,
        "ROOM",
        Constants.SEPARATOR,
        EntityId.make(roomId),
      ],
    }),
  );

  export const OrderShortIdKeyFromString = Schema.TemplateLiteralParser(
    Schema.Literal("ORDER"),
    Schema.Literal(Constants.SEPARATOR),
    ShortId,
  ).pipe(
    Schema.transform(ShortId, {
      strict: true,
      decode: ([, , shortId]) => shortId,
      encode: (shortId) => [
        "ORDER",
        Constants.SEPARATOR,
        ShortId.make(shortId),
      ],
    }),
  );
}
