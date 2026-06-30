import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

import { Base64 } from "../utils";
import { Constants } from "../utils/constants";

export namespace CryptoContract {
  export class InvalidSecretError extends Schema.TaggedErrorClass<InvalidSecretError>()(
    "InvalidSecretError",
    {},
  ) {}

  export class Hash extends Schema.Class<Hash>("Hash")({
    salt: Base64.pipe(Schema.RedactedFromValue),
    derivedKey: Base64.pipe(Schema.RedactedFromValue),
  }) {}

  export const HashFromString = Schema.TemplateLiteralParser([
    Base64, // salt
    Schema.Literal(Constants.SEPARATOR),
    Base64, // derived key
  ]).pipe(
    Schema.decodeTo(Hash, {
      decode: SchemaGetter.transform(([salt, , derivedKey]) => ({ salt, derivedKey })),
      encode: SchemaGetter.transform(({ salt, derivedKey }) => [
        salt,
        Constants.SEPARATOR,
        derivedKey,
      ]),
    }),
  );
}
