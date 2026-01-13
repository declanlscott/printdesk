import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as _String from "effect/String";
import * as Tuple from "effect/Tuple";
import { customAlphabet } from "nanoid";

import { Constants } from "../utils/constants";

import type { ColumnsContract } from "../columns/contract";

export const generateId = customAlphabet<ColumnsContract.EntityId>(
  Constants.NANOID_ALPHABET,
  Constants.NANOID_LENGTH,
);

export const NanoId = Schema.String.pipe(
  Schema.pattern(Constants.NANOID_REGEX),
);

export const HexString = Schema.String.pipe(
  Schema.pattern(Constants.HEX_REGEX),
);

export const separatedString = (separator = Constants.SEPARATOR) =>
  Object.assign(
    Schema.String.annotations({
      description: `a string separated by ${separator}`,
    }).pipe(
      Schema.pattern(
        new RegExp(`^(?:[^${separator}]+(?:${separator}[^${separator}]+)*)?$`),
      ),
      Schema.transform(Schema.Trim.pipe(Schema.Array), {
        strict: true,
        decode: _String.split(separator),
        encode: Array.join(separator),
      }),
    ),
    { separator },
  );

export const Cost = Schema.Union(Schema.Number, Schema.NumberFromString);

export const IsoTimestamp = Schema.String.pipe(
  Schema.pattern(Constants.ISO_TIMESTAMP_REGEX),
);

export const IsoDate = Schema.String.pipe(
  Schema.pattern(Constants.ISO_DATE_REGEX),
);

export const HexColor = Schema.String.pipe(
  Schema.pattern(Constants.HEX_COLOR_REGEX),
);

export const StringFromUnknown = Schema.Unknown.pipe(
  Schema.transform(Schema.String, {
    strict: true,
    decode: String,
    encode: String,
  }),
);

export const paginate =
  (size: number) =>
  <TItem, TError, TContext>(
    self: Effect.Effect<ReadonlyArray<TItem>, TError, TContext>,
  ) =>
    Stream.paginateChunkEffect(undefined, () =>
      self.pipe(
        Effect.map((page) =>
          Tuple.make(
            Chunk.unsafeFromArray(page),
            page.length >= size ? Option.some(undefined) : Option.none(),
          ),
        ),
      ),
    );

export type SnakeToCamel<TSnake extends Lowercase<string>> =
  TSnake extends `${infer First}_${infer Rest}`
    ? `${First}${Capitalize<SnakeToCamel<Lowercase<Rest>>>}`
    : TSnake;

export const snakeToCamel = <TSnake extends Lowercase<string>>(snake: TSnake) =>
  _String.snakeToCamel(snake) as SnakeToCamel<TSnake>;

export const tenantTemplate = (
  template: string,
  tenantId: ColumnsContract.TenantId,
) =>
  template.replace(new RegExp(Constants.TENANT_ID_PLACEHOLDER, "g"), tenantId);

export const getUserInitials = (name: string) =>
  Effect.gen(function* () {
    if (!name) return "";

    const splitName = name.split(" ");
    const firstInitial = yield* Array.head(splitName).pipe(
      Effect.flatMap(_String.charAt(0)),
      Effect.map(_String.toUpperCase),
    );

    if (splitName.length === 1) return firstInitial;

    const lastInitial = yield* Array.last(splitName).pipe(
      Effect.flatMap(_String.charAt(0)),
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

export type Discriminate<
  TEntity,
  TKey extends keyof TEntity,
  TValue extends TEntity[TKey],
> = Omit<TEntity, TKey> & Record<TKey, TValue>;

export interface SchemaAndValue<TValue extends Schema.Schema.Any> {
  schema: TValue;
  value: TValue["Type"];
}
