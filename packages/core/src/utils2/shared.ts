import { Chunk, Effect, Schema } from "effect";

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

export type Page<TElement> = ReadonlyArray<TElement>;

export const paginate = <TPageElement, TError, TContext>(
  page: Effect.Effect<Page<TPageElement>, TError, TContext>,
  size: number,
) =>
  Effect.gen(function* () {
    const all = Chunk.empty<TPageElement>();
    let currentPage: Page<TPageElement>;
    let hasNextPage: boolean;
    do {
      currentPage = yield* page;

      all.pipe(Chunk.append(currentPage));

      hasNextPage = currentPage.length >= size;
    } while (hasNextPage);

    return Chunk.toReadonlyArray(all);
  });
