import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";

import { Constants } from "../utils/constants";
import { generateId } from "../utils/shared";
import { NanoId } from "../utils2";

export namespace ColumnsContract {
  export const VarChar = Schema.Trim.pipe(
    Schema.maxLength(Constants.VARCHAR_LENGTH),
  );
  export type VarChar = typeof VarChar.Type;

  export class Timestamps extends Schema.Class<Timestamps>("Timestamps")({
    createdAt: Schema.DateTimeUtc.pipe(
      Schema.optionalWith({ default: DateTime.unsafeNow }),
    ),
    updatedAt: Schema.DateTimeUtc.pipe(
      Schema.optionalWith({ default: DateTime.unsafeNow }),
    ),
    deletedAt: Schema.DateTimeUtc.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
  }) {}

  export const EntityId = NanoId.pipe(Schema.brand("EntityId"));
  export type EntityId = typeof EntityId.Type;
  export const TenantId = EntityId.pipe(Schema.brand("TenantId"));
  export type TenantId = typeof TenantId.Type;

  export class Tenant extends Schema.Class<Tenant>("Tenant")({
    id: EntityId.pipe(Schema.optionalWith({ default: generateId })),
    tenantId: TenantId,
    ...Timestamps.fields,
  }) {}

  export const Version = Schema.NonNegativeInt.pipe(Schema.brand("Version"));
  export type Version = typeof Version.Type;
}
