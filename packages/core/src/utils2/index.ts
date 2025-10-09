import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as String from "effect/String";
import * as Tuple from "effect/Tuple";

import { Constants } from "../utils/constants";

export const NanoId = Schema.String.pipe(
  Schema.pattern(Constants.NANOID_REGEX),
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

export const paginate = <TItem, TError, TContext>(
  pageEffect: Effect.Effect<ReadonlyArray<TItem>, TError, TContext>,
  size: number,
) =>
  Stream.paginateChunkEffect(undefined, () =>
    pageEffect.pipe(
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
  String.snakeToCamel(snake) as SnakeToCamel<TSnake>;
