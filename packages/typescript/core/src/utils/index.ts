import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as _String from "effect/String";
import * as Struct from "effect/Struct";
import { customAlphabet } from "nanoid";

import { Constants } from "./constants";

export const NanoId = Schema.String.pipe(Schema.check(Schema.isPattern(Constants.NANOID_REGEX)));

export const EntityId = NanoId.pipe(Schema.brand("EntityId"));
export type EntityId = typeof EntityId.Type;

export const generateEntityId = Effect.sync(
  customAlphabet<EntityId>(Constants.NANOID_ALPHABET, Constants.NANOID_LENGTH),
);

export const ShortId = Schema.Int.pipe(
  Schema.check(Schema.isGreaterThan(0)),
  Schema.brand("ShortId"),
);
export type ShortId = typeof ShortId.Type;

export const TenantId = EntityId.pipe(Schema.brand("TenantId"));
export type TenantId = typeof TenantId.Type;

export const Version = Schema.Int.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
  Schema.withDecodingDefaultType(Effect.succeed(0)),
  Schema.withConstructorDefault(Effect.succeed(0)),
  Schema.brand("Version"),
);
export type Version = typeof Version.Type;

export const Base64 = Schema.String.pipe(Schema.check(Schema.isPattern(Constants.BASE64_REGEX)));

export const Separator = Schema.Literal(Constants.SEPARATOR);

export const separatedString = (separator = Constants.SEPARATOR) =>
  Object.assign(
    Schema.String.annotate({ description: `a string separated by ${separator}` }).pipe(
      Schema.check(
        Schema.isPattern(new RegExp(`^(?:[^${separator}]+(?:${separator}[^${separator}]+)*)?$`)),
      ),
      Schema.decodeTo(Schema.Trim.pipe(Schema.Array), {
        decode: SchemaGetter.transform((input) => input.split(separator) as ReadonlyArray<string>),
        encode: SchemaGetter.transform((input) => input.join(separator)),
      }),
    ),
    { separator },
  );

export const Cost = Schema.Union([Schema.Number, Schema.NumberFromString]);

export const IsoTimestamp = Schema.String.pipe(
  Schema.check(Schema.isPattern(Constants.ISO_TIMESTAMP_REGEX)),
);

export const IsoDate = Schema.String.pipe(Schema.check(Schema.isPattern(Constants.ISO_DATE_REGEX)));

export const HexColor = Schema.String.pipe(
  Schema.check(Schema.isPattern(Constants.HEX_COLOR_REGEX)),
);

export const StringFromUnknown = Schema.Unknown.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.transform(String),
    encode: SchemaGetter.passthrough(),
  }),
);

export const Timezone = Schema.Literals(Intl.supportedValuesOf("timeZone"));

export const Ipv4 = Schema.String.pipe(Schema.check(Schema.isPattern(Constants.IPV4_REGEX)));

export const ChunkFromArray = <TValue extends Schema.Top>(value: TValue) =>
  value.pipe(
    Schema.Chunk,
    Schema.encodeTo(value.pipe(Schema.Array), {
      decode: SchemaGetter.transform(Chunk.fromIterable),
      encode: SchemaGetter.transform(Chunk.toArray),
    }),
  );

export const tenantTemplate = (template: string, tenantId: TenantId) =>
  template.replace(new RegExp(Constants.TENANT_ID_PLACEHOLDER, "g"), tenantId);

export const getUserInitials = Effect.fn(function* (name: string) {
  if (!name) return "";

  const splitName = name.split(" ");

  const firstInitial = yield* Array.head(splitName).pipe(
    Option.flatMap((firstName) => _String.charAt(firstName, 0)),
    Effect.fromOption,
    Effect.map(_String.toUpperCase),
  );

  if (splitName.length === 1) return firstInitial;

  const lastInitial = yield* Array.last(splitName).pipe(
    Option.flatMap((lastName) => _String.charAt(lastName, 0)),
    Effect.fromOption,
    Effect.map(_String.toUpperCase),
  );

  return `${firstInitial}${lastInitial}`;
});

export type Prettify<TObject> = {
  [TKey in keyof TObject]: TObject[TKey];
} & {};

export type StartsWith<
  TPrefix extends string,
  TValue extends string,
> = TValue extends `${TPrefix}${string}` ? TValue : never;

export type EndsWith<
  TSuffix extends string,
  TValue extends string,
> = TValue extends `${string}${TSuffix}` ? TValue : never;

export type Discriminate<TEntity, TKey extends keyof TEntity, TValue extends TEntity[TKey]> = Omit<
  TEntity,
  TKey
> &
  Record<TKey, TValue>;

export interface SchemaAndValue<TSchema extends Schema.Top> {
  schema: TSchema;
  value: TSchema["Type"];
}

// oxlint-disable-next-line typescript/no-explicit-any
export type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never;

export const pluck =
  <TPropertyKey extends PropertyKey>(propertyKey: TPropertyKey) =>
  <TSchema extends Schema.Top>(
    schema: Schema.Struct<{ [TKey in TPropertyKey]: TSchema }>,
  ): Schema.decodeTo<Schema.toType<TSchema>, Schema.Struct<{ [K in TPropertyKey]: TSchema }>> =>
    schema.mapFields(Struct.pick([propertyKey])).pipe(
      Schema.decodeTo(Schema.toType(schema.fields[propertyKey]), {
        // oxlint-disable-next-line typescript/no-explicit-any
        decode: SchemaGetter.transform((whole: any) => whole[propertyKey]),
        // oxlint-disable-next-line typescript/no-explicit-any
        encode: SchemaGetter.transform((value) => ({ [propertyKey]: value }) as any),
      }),
    );
