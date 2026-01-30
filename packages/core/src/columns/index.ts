import * as MsgPack from "@effect/platform/MsgPack";
import { sql } from "drizzle-orm";
import {
  char,
  customType,
  integer,
  varchar as pgVarchar,
} from "drizzle-orm/pg-core";
import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";

import { CryptoContract } from "../auth/contracts";
import { generateId } from "../utils";
import { Constants } from "../utils/constants";
import { ColumnsContract } from "./contract";

import type { Writable } from "drizzle-orm";
import type { PgVarcharConfig } from "drizzle-orm/pg-core";

export namespace Columns {
  export const varchar = <
    TMember extends string,
    TEnum extends Readonly<[TMember, ...Array<TMember>]>,
    TLength extends number | undefined,
  >(
    config: PgVarcharConfig<TEnum | Writable<TEnum>, TLength> = {
      length: Constants.VARCHAR_LENGTH as TLength,
    },
  ) => pgVarchar(config);

  export const hash = customType<{
    driverData: typeof CryptoContract.HashFromString.Encoded;
    data: typeof CryptoContract.HashFromString.Type;
  }>({
    // 24 (salt, 16B) + 1 (separator) + 88 (derived key, 32B) = 113 characters. Base64 encoded.
    dataType: () => "varchar(113)",
    fromDriver: Schema.decodeSync(CryptoContract.HashFromString),
    toDriver: Schema.encodeSync(CryptoContract.HashFromString),
  });

  export function redactedUuid() {
    const RedactedUuid = Schema.UUID.pipe(Schema.Redacted);

    const make = customType<{
      driverData: typeof RedactedUuid.Encoded;
      data: typeof RedactedUuid.Type;
    }>({
      dataType: () => "uuid",
      fromDriver: Schema.decodeSync(RedactedUuid),
      toDriver: Schema.encodeSync(RedactedUuid),
    });

    return make();
  }

  export const datetime = customType<{
    driverData: typeof Schema.DateTimeUtc.Encoded;
    data: typeof Schema.DateTimeUtc.Type;
  }>({
    dataType: () => "timestamp",
    fromDriver: Schema.decodeSync(Schema.DateTimeUtc),
    toDriver: Schema.encodeSync(Schema.DateTimeUtc),
  });

  export function jsonb<TSchema extends Schema.Schema.AnyNoContext>(
    schema: TSchema,
  ) {
    const Jsonb = schema.pipe(MsgPack.schema);

    const make = customType<{
      driverData: typeof Jsonb.Encoded;
      data: typeof Jsonb.Type;
    }>({
      dataType: () => "bytea",
      // @ts-expect-error TypeScript doesn't know that `Context<TSchema>` is `never`.
      fromDriver: Schema.decodeSync(Jsonb),
      // @ts-expect-error TypeScript doesn't know that `Context<TSchema>` is `never`.
      toDriver: Schema.encodeSync(Jsonb),
    });

    return make();
  }

  export function union<const TMembers extends ReadonlyArray<string>>(
    members: TMembers,
    length = Constants.VARCHAR_LENGTH,
  ) {
    const Union = Schema.Literal(...members).pipe(Schema.maxLength(length));

    const make = customType<{
      driverData: typeof Union.Encoded;
      data: typeof Union.Type;
    }>({
      dataType: () => `varchar(${length})`,
      fromDriver: Schema.decodeSync(Union),
      toDriver: Schema.encodeSync(Union),
    });

    return make();
  }

  /**
   * NanoID column
   */
  export function id<T>() {
    return char({ length: Constants.NANOID_LENGTH }).$type<T>();
  }

  /**
   * Primary key nanoID column
   */
  export const primaryId = id().$default(generateId).primaryKey();

  /**
   * Entity ID column
   */
  export const entityId = id<ColumnsContract.EntityId>();

  /**
   * Short ID column
   */
  export const shortId = integer().$type<ColumnsContract.ShortId>();

  /**
   * Non-nullable Tenant ID column
   */
  export const tenantId = id<ColumnsContract.TenantId>().notNull();

  /**
   * IDs for tenant owned tables (used as composite primary key)
   */
  export const tenant = {
    get id() {
      return entityId.notNull().$defaultFn(generateId);
    },
    get tenantId() {
      return tenantId;
    },
  };

  /**
   * Timestamps columns
   */
  export const timestamps = {
    get createdAt() {
      return datetime()
        .notNull()
        .default(sql`now()`);
    },
    get updatedAt() {
      return datetime()
        .notNull()
        .default(sql`now()`)
        .$onUpdateFn(DateTime.unsafeNow);
    },
    get deletedAt() {
      return datetime();
    },
  };
  export type Timestamp = keyof typeof timestamps;

  /**
   * Version column
   */
  export const version = integer().$type<ColumnsContract.Version>();

  /**
   * Sync version column
   */
  export const syncVersion = {
    get version() {
      return version
        .notNull()
        .default(ColumnsContract.Version.make(1))
        .$onUpdateFn(() => sql`version + 1`);
    },
  };

  export type Sync = typeof tenant & typeof timestamps & typeof syncVersion;
  export type NonSync = typeof tenant & typeof timestamps;
  export type Internal = typeof tenant;
}
