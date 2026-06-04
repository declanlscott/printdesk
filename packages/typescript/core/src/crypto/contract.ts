import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { Base64 } from "../utils";
import { Constants } from "../utils/constants";

export namespace CryptoContract {
  export class InvalidSecretError extends Schema.TaggedErrorClass<InvalidSecretError>()(
    "InvalidSecretError",
    {},
  ) {}

  export class JwtDecodeError extends Schema.TaggedErrorClass<JwtDecodeError>()("JwtDecodeError", {
    cause: Schema.Defect(),
  }) {}

  export class Hash extends Schema.Class<Hash>("Hash")({
    salt: Base64.pipe(Schema.RedactedFromValue),
    derivedKey: Base64.pipe(Schema.RedactedFromValue),
  }) {}

  export const HashFromString = Schema.TemplateLiteralParser([
    Base64, // salt
    Schema.Literal(Constants.SEPARATOR),
    Base64, // derived key
  ]).pipe(
    Schema.decodeTo(
      Hash,
      SchemaTransformation.transform({
        decode: ([salt, , derivedKey]) => ({ salt, derivedKey }),
        encode: ({ salt, derivedKey }) => [salt, Constants.SEPARATOR, derivedKey],
      }),
    ),
  );
}
