import * as Data from "effect/Data";
import * as Number from "effect/Number";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ActorsContract } from "../actors/contract";
import { HexString } from "../utils";
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

  export class SecretHash extends Schema.Class<SecretHash>("SecretHash")({
    salt: HexString.pipe(Schema.Redacted),
    derivedKey: HexString.pipe(Schema.Redacted),
  }) {}

  export const SecretHashFromString = Schema.TemplateLiteralParser(
    HexString, // salt
    Schema.Literal(Constants.SEPARATOR),
    HexString, // derived key
  ).pipe(
    Schema.transform(SecretHash, {
      strict: true,
      decode: ([salt, _, derivedKey]) => ({ salt, derivedKey }),
      encode: ({ salt, derivedKey }) => [salt, Constants.SEPARATOR, derivedKey],
    }),
  );

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
