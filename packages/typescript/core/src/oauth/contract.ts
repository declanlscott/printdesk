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
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { ActorsContract } from "../actors/contract";
import { TenantId } from "../utils";
import { Constants } from "../utils/constants";

export namespace OauthContract {
  export class OpenauthError
    extends Schema.TaggedErrorClass<OpenauthError>()(
      "OpenauthError",
      { cause: Schema.Defect() },
      { httpApiStatus: 500 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(OpenauthError)(this, { status: 500 });
  }

  export class InvalidScopeError extends Schema.TaggedErrorClass<InvalidScopeError>()(
    "InvalidScopeError",
    { scopes: Schema.String.pipe(Schema.Array) },
  ) {}

  export class InvalidAuthorizationCodeError extends Schema.TaggedErrorClass<InvalidAuthorizationCodeError>()(
    "InvalidAuthorizationCodeError",
    { cause: Schema.instanceOf(OpenauthInvalidAuthorizationCodeError) },
    { httpApiStatus: 400 },
  ) {}

  export class InvalidAccessTokenError
    extends Schema.TaggedErrorClass<InvalidAccessTokenError>()(
      "InvalidAccessTokenError",
      { cause: Schema.instanceOf(OpenauthInvalidAccessTokenError) },
      { httpApiStatus: 401 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(InvalidAccessTokenError)(this, { status: 401 });
  }

  export class InvalidRefreshTokenError
    extends Schema.TaggedErrorClass<InvalidRefreshTokenError>()(
      "InvalidRefreshTokenError",
      { cause: Schema.instanceOf(OpenauthInvalidRefreshTokenError) },
      { httpApiStatus: 401 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(InvalidRefreshTokenError)(this, { status: 401 });
  }

  export class TokensError extends Schema.TaggedErrorClass<TokensError>()("TokensError", {
    cause: Schema.Defect(),
  }) {}

  export class InvalidAudienceError extends Schema.TaggedErrorClass<InvalidAudienceError>()(
    "InvalidAudienceError",
    { expected: Schema.NonEmptyString, received: Schema.NonEmptyString },
  ) {}

  export class TenantSuspendedError extends Schema.TaggedErrorClass<TenantSuspendedError>()(
    "TenantSuspendedError",
    { tenantId: TenantId },
  ) {}

  interface Actable<TTag extends typeof ActorsContract.Actor.fields.properties.Type._tag> {
    actor: Extract<typeof ActorsContract.Actor.fields.properties.Type, { _tag: TTag }>;
  }

  export class ClientSubject
    extends Schema.TaggedClass<ClientSubject>()("ClientSubject", {
      ...Struct.omit(ActorsContract.ClientActor.fields, ["_tag"]),
      scopes: Schema.NonEmptyString.pipe(Schema.Array, Schema.optional),
    })
    implements Actable<typeof ActorsContract.ClientActor.Type._tag>
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
    implements Actable<typeof ActorsContract.UserActor.Type._tag>
  {
    public get actor() {
      return new ActorsContract.UserActor({
        id: this.id,
        tenantId: this.tenantId,
        role: this.role,
      });
    }
  }

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
      Schema.optional,
    ),
  }) {}

  export class AuthorizeError extends Schema.TaggedErrorClass<AuthorizeError>()(
    "AuthorizeError",
    { cause: Schema.Defect() },
    { httpApiStatus: 500 },
  ) {}

  export class AuthorizeSuccess extends Schema.Class<AuthorizeSuccess>("AuthorizeSuccess")({
    challenge: Schema.Struct({
      state: Schema.NonEmptyString,
      verifier: Schema.NonEmptyString.pipe(Schema.optional),
    }),
    url: Schema.URLFromString,
  }) {}

  export class ExchangeError extends Schema.TaggedErrorClass<ExchangeError>()(
    "ExchangeError",
    { cause: Schema.Defect() },
    { httpApiStatus: 500 },
  ) {}

  export class ExchangeSuccess extends Schema.Class<ExchangeSuccess>("ExchangeSuccess")({
    tokens: Tokens,
  }) {}

  export class RefreshError extends Schema.TaggedErrorClass<RefreshError>()("RefreshError", {
    cause: Schema.Defect(),
  }) {}

  export class RefreshSuccess extends Schema.Class<RefreshSuccess>("RefreshSuccess")({
    tokens: Tokens.pipe(Schema.OptionFromOptional),
  }) {}

  export class VerifyError
    extends Schema.TaggedErrorClass<VerifyError>()(
      "VerifyError",
      { cause: Schema.Defect() },
      { httpApiStatus: 500 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(VerifyError)(this, { status: 500 });
  }

  export class ClientCredentialsError
    extends Schema.TaggedErrorClass<ClientCredentialsError>()(
      "ClientCredentialsError",
      { cause: Schema.Defect() },
      { httpApiStatus: 500 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(ClientCredentialsError)(this, { status: 500 });
  }

  export const VerifySuccess = Schema.Struct({
    tokens: Tokens.pipe(Schema.OptionFromOptional),
    audience: Schema.NonEmptyString,
    subject: Schema.Union(
      Array.map(
        Record.toEntries(subjects),
        ([type, properties]) =>
          Schema.Struct({ type: Schema.Literal(type), properties }) as {
            readonly [TKey in keyof typeof subjects]: Schema.Struct<{
              type: Schema.Literal<TKey>;
              properties: (typeof subjects)[TKey];
            }>;
          }[keyof typeof subjects],
      ),
    ),
  }).pipe(Schema.encodeKeys({ audience: "aud" }));

  export const AuthCookies = Tokens.mapFields(Struct.omit(["expiresIn"])).pipe(
    Schema.encodeKeys({
      access: Constants.COOKIE_NAMES.ACCESS_TOKEN,
      refresh: Constants.COOKIE_NAMES.REFRESH_TOKEN,
    }),
  );

  export const Cookies = Schema.Union([Schema.Struct({}), AuthCookies]);

  export class InvalidCookiesError
    extends Schema.TaggedErrorClass<InvalidCookiesError>()("InvalidCookiesError", {
      cause: Schema.instanceOf(Schema.SchemaError),
    })
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(InvalidCookiesError)(this, { status: 400 });
  }
}
