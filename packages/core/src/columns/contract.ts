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

  export const TenantId = EntityId.pipe(Schema.brand("TenantId"));
  export type TenantId = typeof TenantId.Type;

  export class Tenant extends Schema.Class<Tenant>("Tenant")({
    id: EntityId.pipe(Schema.optionalWith({ default: generateId })),
    tenantId: TenantId,
    ...Timestamps.fields,
  }) {}

  export const Version = Schema.NonNegativeInt.pipe(Schema.brand("Version"));
  export type Version = typeof Version.Type;
  export const NullableVersion = ColumnsContract.Version.pipe(
    Schema.NullOr,
    Schema.optionalWith({ default: () => null }),
  );
}
