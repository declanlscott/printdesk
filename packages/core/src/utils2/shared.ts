import { Schema } from "effect";

import { Constants } from "../utils/constants";

export const NanoId = Schema.String.pipe(
  Schema.pattern(Constants.NANOID_REGEX),
);
export type NanoId = Schema.Schema.Type<typeof NanoId>;

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
