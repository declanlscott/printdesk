import {
  InvalidAccessTokenError as OpenauthInvalidAccessTokenError,
  InvalidAuthorizationCodeError as OpenauthInvalidAuthorizationCodeError,
  InvalidRefreshTokenError as OpenauthInvalidRefreshTokenError,
} from "@openauthjs/openauth/error";
import * as Array from "effect/Array";
import * as Number from "effect/Number";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as Struct from "effect/Struct";

import { ActorsContract } from "../actors/contract";
import { TenantId } from "../utils";
import { Constants } from "../utils/constants";

export namespace OauthContract {
  export const AuthorizeUrlParams = Schema.Struct({ redirectUri: Schema.URL }).pipe(
    Schema.encodeKeys({ redirectUri: Constants.URL_PARAM_NAMES.REDIRECT_URI }),
  );

  export const CallbackUrlParams = Schema.Struct({
    ...AuthorizeUrlParams.to.fields,
    code: Schema.NonEmptyString,
  }).pipe(Schema.encodeKeys({ redirectUri: Constants.URL_PARAM_NAMES.REDIRECT_URI }));

  export class OpenauthError extends Schema.TaggedErrorClass<OpenauthError>()("OpenauthError", {
    cause: Schema.Defect,
  }) {}

  export class InvalidScopeError extends Schema.TaggedErrorClass<InvalidScopeError>()(
    "InvalidScopeError",
    { scopes: Schema.String.pipe(Schema.Array) },
  ) {}

  export class InvalidAuthorizationCodeError extends Schema.TaggedErrorClass<InvalidAuthorizationCodeError>()(
    "InvalidAuthorizationCodeError",
    { cause: Schema.instanceOf(OpenauthInvalidAuthorizationCodeError) },
    { httpApiStatus: 400 },
  ) {}

  export class InvalidAccessTokenError extends Schema.TaggedErrorClass<InvalidAccessTokenError>()(
    "InvalidAccessTokenError",
    { cause: Schema.instanceOf(OpenauthInvalidAccessTokenError) },
    { httpApiStatus: 401 },
  ) {}

  export class InvalidRefreshTokenError extends Schema.TaggedErrorClass<InvalidRefreshTokenError>()(
    "InvalidRefreshTokenError",
    { cause: Schema.instanceOf(OpenauthInvalidRefreshTokenError) },
    { httpApiStatus: 401 },
  ) {}

  export class TokensError extends Schema.TaggedErrorClass<TokensError>()("TokensError", {
    cause: Schema.Defect,
  }) {}

  export class InvalidAudienceError extends Schema.TaggedErrorClass<InvalidAudienceError>()(
    "InvalidAudienceError",
    { expected: Schema.NonEmptyString, received: Schema.NonEmptyString },
  ) {}

  export class TenantSuspendedError extends Schema.TaggedErrorClass<TenantSuspendedError>()(
    "TenantSuspendedError",
    { tenantId: TenantId },
  ) {}

  interface Actable {
    actor: typeof ActorsContract.Actor.fields.properties.Type;
  }

  export class ClientSubject
    extends Schema.TaggedClass<ClientSubject>()("ClientSubject", {
      ...Struct.omit(ActorsContract.ClientActor.fields, ["_tag"]),
      scopes: Schema.NonEmptyString.pipe(Schema.Array, Schema.optional),
    })
    implements Actable
  {
    public get actor() {
      return new ActorsContract.ClientActor({
        id: this.id,
        tenantId: this.tenantId,
        role: this.role,
      });
    }
  }

  export class UserSubject
    extends Schema.TaggedClass<UserSubject>()(
      "UserSubject",
      Struct.omit(ActorsContract.UserActor.fields, ["_tag"]),
    )
    implements Actable
  {
    public get actor() {
      return new ActorsContract.UserActor({
        id: this.id,
        tenantId: this.tenantId,
        role: this.role,
      });
    }
  }

  export const Subjects = Schema.Union([ClientSubject, UserSubject]);

  export const subjects = {
    [ClientSubject.fields._tag.schema.literal]: ClientSubject.pipe(Schema.toStandardSchemaV1),
    [UserSubject.fields._tag.schema.literal]: UserSubject.pipe(Schema.toStandardSchemaV1),
  };

  export class Tokens extends Schema.Class<Tokens>("Tokens")({
    access: Schema.NonEmptyString.pipe(Schema.RedactedFromValue),
    refresh: Schema.NonEmptyString.pipe(Schema.RedactedFromValue),
    expiresIn: Schema.Number.pipe(
      Schema.decodeTo(
        Schema.DurationFromMillis,
        SchemaTransformation.transform({
          decode: Number.multiply(1_000),
          encode: Number.divideUnsafe(1_000),
        }),
      ),
    ),
  }) {}

  export class AuthorizeError extends Schema.TaggedErrorClass<AuthorizeError>()("AuthorizeError", {
    cause: Schema.Defect,
  }) {}

  export class AuthorizeSuccess extends Schema.Class<AuthorizeSuccess>("AuthorizeSuccess")({
    challenge: Schema.Struct({
      state: Schema.NonEmptyString,
      verifier: Schema.NonEmptyString.pipe(Schema.optional),
    }),
    url: Schema.URLFromString,
  }) {}

  export class ExchangeError extends Schema.TaggedErrorClass<ExchangeError>()("ExchangeError", {
    cause: Schema.Defect,
  }) {}

  export class ExchangeSuccess extends Schema.Class<ExchangeSuccess>("ExchangeSuccess")({
    tokens: Tokens,
  }) {}

  export class RefreshError extends Schema.TaggedErrorClass<RefreshError>()("RefreshError", {
    cause: Schema.Defect,
  }) {}

  export class RefreshSuccess extends Schema.Class<RefreshSuccess>("RefreshSuccess")({
    tokens: Tokens.pipe(Schema.OptionFromUndefinedOr),
  }) {}

  export class VerifyError extends Schema.TaggedErrorClass<VerifyError>()(
    "VerifyError",
    { cause: Schema.Defect },
    { httpApiStatus: 401 },
  ) {}

  export const VerifySuccess = Schema.Struct({
    tokens: Tokens.pipe(Schema.OptionFromUndefinedOr),
    audience: Schema.NonEmptyString,
    subject: Schema.Union(
      Array.map(Record.toEntries(subjects), ([type, properties]) =>
        Schema.Struct({ type: Schema.Literal(type), properties }),
      ),
    ),
  }).pipe(Schema.encodeKeys({ audience: "aud" }));

  export const Cookies = Schema.Union([
    Schema.Struct({}),
    Schema.Struct({
      accessToken: Schema.NonEmptyString.pipe(Schema.RedactedFromValue),
      refreshToken: Schema.NonEmptyString.pipe(Schema.RedactedFromValue),
    }).pipe(
      Schema.encodeKeys({
        accessToken: Constants.COOKIE_NAMES.ACCESS_TOKEN,
        refreshToken: Constants.COOKIE_NAMES.REFRESH_TOKEN,
      }),
    ),
  ]);
}
