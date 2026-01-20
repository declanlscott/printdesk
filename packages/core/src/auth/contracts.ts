import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Data from "effect/Data";
import * as Number from "effect/Number";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ActorsContract } from "../actors/contract";
import { Base64 } from "../utils";
import { Constants } from "../utils/constants";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ColumnsContract } from "../columns/contract";

export namespace AuthContract {
  export class UserSubject extends Schema.TaggedClass<UserSubject>(
    "UserSubject",
  )("UserSubject", Struct.omit(ActorsContract.UserActor.fields, "_tag")) {}

  export const subjects: {
    [UserSubject._tag]: StandardSchemaV1<
      typeof UserSubject.Encoded,
      typeof UserSubject.Type
    > &
      Schema.SchemaClass<
        typeof UserSubject.Type,
        typeof UserSubject.Encoded,
        never
      >;
  } = { [UserSubject._tag]: UserSubject.pipe(Schema.standardSchemaV1) };

  export class InvalidAudienceError extends Data.TaggedError(
    "InvalidAudienceError",
  )<{
    readonly expected: string;
    readonly received: string;
  }> {}

  export class TenantSuspendedError extends Data.TaggedError(
    "TenantSuspendedError",
  )<{ readonly tenantId: ColumnsContract.TenantId }> {}

  export class OauthTokens extends Schema.Class<OauthTokens>("OauthTokens")({
    access: Schema.String.pipe(Schema.Redacted),
    refresh: Schema.String.pipe(Schema.Redacted),
    expiresIn: Schema.Number.pipe(
      Schema.transform(Schema.DateTimeUtcFromNumber, {
        strict: true,
        decode: Number.multiply(1_000),
        encode: Number.unsafeDivide(1_000),
      }),
    ),
  }) {}
}

export namespace CryptoContract {
  export class TokenGenerationError extends Schema.TaggedError<TokenGenerationError>(
    "TokenGenerationError",
  )(
    "TokenGenerationError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export class KeyDerivationError extends Schema.TaggedError<KeyDerivationError>(
    "KeyDerivationError",
  )(
    "KeyDerivationError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export class KeyBufferError extends Schema.TaggedClass<KeyBufferError>(
    "KeyBufferError",
  )(
    "KeyBufferError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export class KeyVerificationError extends Schema.TaggedClass<KeyVerificationError>(
    "KeyVerificationError",
  )(
    "KeyVerificationError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export class InvalidSecretError extends Schema.TaggedError<InvalidSecretError>(
    "InvalidSecretError",
  )("InvalidSecretError", {}, HttpApiSchema.annotations({ status: 401 })) {}

  export class JwtDecodeError extends Schema.TaggedError<JwtDecodeError>(
    "JwtDecodeError",
  )(
    "JwtDecodeError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 400 }),
  ) {}

  export class Hash extends Schema.Class<Hash>("Hash")({
    salt: Base64.pipe(Schema.Redacted),
    derivedKey: Base64.pipe(Schema.Redacted),
  }) {}

  export const HashFromString = Schema.TemplateLiteralParser(
    Base64, // salt
    Schema.Literal(Constants.SEPARATOR),
    Base64, // derived key
  ).pipe(
    Schema.transform(Hash, {
      strict: true,
      decode: ([salt, _, derivedKey]) => ({ salt, derivedKey }),
      encode: ({ salt, derivedKey }) => [salt, Constants.SEPARATOR, derivedKey],
    }),
  );
}
