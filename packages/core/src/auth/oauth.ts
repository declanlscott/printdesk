import { createClient } from "@openauthjs/openauth/client";
import {
  InvalidAccessTokenError as InvalidAccessTokenErrorCause,
  InvalidAuthorizationCodeError as InvalidAuthorizationCodeErrorCause,
  InvalidRefreshTokenError as InvalidRefreshTokenErrorCause,
} from "@openauthjs/openauth/error";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";

import type {
  ClientInput,
  ExchangeError,
  RefreshError,
  VerifyError,
} from "@openauthjs/openauth/client";
import type { SubjectSchema } from "@openauthjs/openauth/subject";

export namespace Oauth {
  export class ClientError extends Data.TaggedError("ClientError")<{
    readonly cause: unknown;
  }> {}

  export class InvalidAuthorizationCodeError extends Data.TaggedError(
    "InvalidAuthorizationCodeError",
  )<{ readonly cause: InvalidAuthorizationCodeErrorCause }> {}

  export class InvalidRefreshTokenError extends Data.TaggedError(
    "InvalidRefreshTokenError",
  )<{ readonly cause: InvalidRefreshTokenErrorCause }> {}

  export class InvalidAccessTokenError extends Data.TaggedError(
    "InvalidAccessTokenError",
  )<{ readonly cause: InvalidAccessTokenErrorCause }> {}

  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/auth/OauthClient",
    {
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
                Effect.suspend(() => {
                  const matchError = Match.type<ExchangeError["err"]>().pipe(
                    Match.when(
                      Match.instanceOf(InvalidAuthorizationCodeErrorCause),
                      (cause) => new InvalidAuthorizationCodeError({ cause }),
                    ),
                    Match.orElse((cause) => new ClientError({ cause })),
                  );

                  if (result.err !== false)
                    return Effect.fail(matchError(result.err));

                  return Effect.succeed(result.tokens);
                }),
              ),
            );

          const refresh = (...args: Parameters<typeof client.refresh>) =>
            Effect.tryPromise({
              try: () => client.refresh(...args),
              catch: (cause) => new ClientError({ cause }),
            }).pipe(
              Effect.flatMap((result) =>
                Effect.suspend(() => {
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

                  if (result.err !== false)
                    return Effect.fail(matchError(result.err));

                  return Effect.succeed(result.tokens);
                }),
              ),
            );

          const verify = <TSubjectSchema extends SubjectSchema>(
            ...args: Parameters<typeof client.verify<TSubjectSchema>>
          ) =>
            Effect.tryPromise({
              try: () => client.verify(...args),
              catch: (cause) => new ClientError({ cause }),
            }).pipe(
              Effect.flatMap((result) =>
                Effect.suspend(() => {
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
                    return Effect.fail(matchError(result.err));

                  return Effect.succeed(result);
                }),
              ),
            );

          return { authorize, exchange, refresh, verify };
        }),
    },
  ) {}
}
