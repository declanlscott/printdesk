import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import { createClient } from "@openauthjs/openauth/client";
import {
  InvalidAccessTokenError as InvalidAccessTokenErrorCause,
  InvalidAuthorizationCodeError as InvalidAuthorizationCodeErrorCause,
  InvalidRefreshTokenError as InvalidRefreshTokenErrorCause,
} from "@openauthjs/openauth/error";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { AuthContract } from "./contracts";

import type {
  ClientInput,
  ExchangeError,
  RefreshError,
  RefreshOptions,
  VerifyError,
  VerifyOptions,
} from "@openauthjs/openauth/client";

export namespace Oauth {
  export class ClientError extends Schema.TaggedError<ClientError>(
    "ClientError",
  )(
    "ClientError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export class InvalidAuthorizationCodeError extends Data.TaggedError(
    "InvalidAuthorizationCodeError",
  )<{ readonly cause: InvalidAuthorizationCodeErrorCause }> {}

  export class InvalidRefreshTokenError extends Schema.TaggedError<InvalidRefreshTokenError>(
    "InvalidRefreshTokenError",
  )(
    "InvalidRefreshTokenError",
    {},
    HttpApiSchema.annotations({ status: 401 }),
  ) {}

  export class InvalidAccessTokenError extends Schema.TaggedError<InvalidAccessTokenError>(
    "InvalidAccessTokenError",
  )(
    "InvalidAccessTokenError",
    {},
    HttpApiSchema.annotations({ status: 401 }),
  ) {}

  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/auth/OauthClient",
    {
      accessors: true,
      effect: (input: ClientInput) =>
        Effect.gen(function* () {
          const client = yield* Effect.try({
            try: () => createClient(input),
            catch: (cause) => new ClientError({ cause }),
          });

          const authorize = (...args: Parameters<typeof client.authorize>) =>
            Effect.tryPromise({
              try: () => client.authorize(...args),
              catch: (cause) => new ClientError({ cause }),
            });

          const exchange = (...args: Parameters<typeof client.exchange>) =>
            Effect.tryPromise({
              try: () => client.exchange(...args),
              catch: (cause) => new ClientError({ cause }),
            }).pipe(
              Effect.flatMap((result) =>
                Effect.gen(function* () {
                  const matchError = Match.type<ExchangeError["err"]>().pipe(
                    Match.when(
                      Match.instanceOf(InvalidAuthorizationCodeErrorCause),
                      (cause) => new InvalidAuthorizationCodeError({ cause }),
                    ),
                    Match.orElse((cause) => new ClientError({ cause })),
                  );

                  if (result.err !== false)
                    return yield* matchError(result.err);

                  const decode = Schema.decode(AuthContract.OauthTokens);

                  return yield* decode(result.tokens);
                }),
              ),
            );

          const refresh = (
            refresh: Redacted.Redacted<string>,
            opts?: RefreshOptions,
          ) =>
            Effect.gen(function* () {
              const result = yield* Effect.tryPromise({
                try: () => client.refresh(refresh.pipe(Redacted.value), opts),
                catch: (cause) => new ClientError({ cause }),
              });

              const matchError = Match.type<RefreshError["err"]>().pipe(
                Match.when(
                  Match.instanceOf(InvalidRefreshTokenErrorCause),
                  (cause) => new InvalidRefreshTokenError({ cause }),
                ),
                Match.when(
                  Match.instanceOf(InvalidAccessTokenErrorCause),
                  (cause) => new InvalidAccessTokenError({ cause }),
                ),
                Match.orElse((cause) => new ClientError({ cause })),
              );

              if (result.err !== false) return yield* matchError(result.err);

              const decode = Schema.decode(
                AuthContract.OauthTokens.pipe(Schema.OptionFromUndefinedOr),
              );

              return yield* decode(result.tokens);
            });

          const verify = (
            token: Redacted.Redacted<string>,
            opts?: VerifyOptions,
          ) =>
            Effect.gen(function* () {
              const result = yield* Effect.tryPromise({
                try: () =>
                  client.verify(
                    AuthContract.subjects,
                    token.pipe(Redacted.value),
                    opts,
                  ),
                catch: (cause) => new ClientError({ cause }),
              });

              const matchError = Match.type<VerifyError["err"]>().pipe(
                Match.when(
                  Match.instanceOf(InvalidRefreshTokenErrorCause),
                  (cause) => new InvalidRefreshTokenError({ cause }),
                ),
                Match.when(
                  Match.instanceOf(InvalidAccessTokenErrorCause),
                  (cause) => new InvalidAccessTokenError({ cause }),
                ),
                Match.orElse((cause) => new ClientError({ cause })),
              );

              if (result.err !== undefined)
                return yield* matchError(result.err);

              const decode = Schema.decode(
                Schema.Struct({
                  tokens: AuthContract.OauthTokens.pipe(
                    Schema.OptionFromUndefinedOr,
                  ),
                  audience: Schema.String.pipe(
                    Schema.propertySignature,
                    Schema.fromKey("aud"),
                  ),
                  subject: Schema.Struct({
                    type: Schema.Literal(AuthContract.UserSubject._tag),
                    properties: AuthContract.UserSubject,
                  }),
                }),
              );

              return yield* decode({
                tokens: result.tokens,
                aud: result.aud,
                subject: result.subject,
              });
            });

          return { authorize, exchange, refresh, verify };
        }),
    },
  ) {
    static readonly runtime = (input: ClientInput) =>
      this.Default(input).pipe(ManagedRuntime.make);
  }
}
