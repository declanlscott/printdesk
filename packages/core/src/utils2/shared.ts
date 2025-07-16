import { Schema } from "effect";

import { Constants } from "../utils/constants";

export const NanoId = Schema.String.pipe(
  Schema.pattern(Constants.NANOID_REGEX),
);
export type NanoId = Schema.Schema.Type<typeof NanoId>;
