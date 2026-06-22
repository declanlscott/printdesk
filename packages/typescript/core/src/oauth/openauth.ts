import { createClient } from "@openauthjs/openauth/client";
import {
  InvalidAccessTokenError,
  InvalidAuthorizationCodeError,
  InvalidRefreshTokenError,
} from "@openauthjs/openauth/error";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { Constants } from "../utils/constants";
import { OauthContract } from "./contract";

import type {
  ClientInput as OpenauthClientInput,
  RefreshOptions as OpenauthRefreshOptions,
  VerifyOptions as OpenauthVerifyOptions,
} from "@openauthjs/openauth/client";

export namespace Openauth {
  export interface ClientInput extends Omit<OpenauthClientInput, "issuer"> {
    issuer: string;
  }

  export interface RefreshOptions extends Omit<OpenauthRefreshOptions, "access"> {
    access?: Redacted.Redacted<string>;
  }

  export interface VerifyOptions extends Omit<OpenauthVerifyOptions, "refresh"> {
    refresh?: Redacted.Redacted<string>;
  }

  export class Openauth extends Context.Service<Openauth>()("@printdesk/core/oauth/Openauth", {
    make: Effect.fn(function* (input: ClientInput) {
      const openauth = yield* Effect.try({
        try: () => createClient(input),
        catch: (cause) => new OauthContract.OpenauthError({ cause }),
      });

      const authorize = (...args: Parameters<typeof openauth.authorize>) =>
        Effect.tryPromise({
          try: () => openauth.authorize(...args),
          catch: (cause) => new OauthContract.AuthorizeError({ cause }),
        }).pipe(
          Effect.flatMap(Schema.decodeEffect(OauthContract.AuthorizeSuccess)),
          Effect.catchTag("SchemaError", Effect.die),
        );

      const exchange = Effect.fn(function* (...args: Parameters<typeof openauth.exchange>) {
        const result = yield* Effect.tryPromise({
          try: () => openauth.exchange(...args),
          catch: (cause) => new OauthContract.ExchangeError({ cause }),
        });

        if (result.err !== false)
          return yield* Match.value(result.err).pipe(
            Match.when(
              Match.instanceOf(InvalidAuthorizationCodeError),
              (cause) => new OauthContract.InvalidAuthorizationCodeError({ cause }),
            ),
            Match.orElse((cause) => new OauthContract.ExchangeError({ cause })),
          );

        const decode = Schema.decodeEffect(OauthContract.ExchangeSuccess);

        return yield* decode(result).pipe(Effect.orDie);
      });

      const refresh = Effect.fn(function* (
        refresh: Redacted.Redacted<string>,
        opts?: RefreshOptions,
      ) {
        const result = yield* Effect.tryPromise({
          try: () =>
            openauth.refresh(refresh.pipe(Redacted.value), {
              ...opts,
              access: opts?.access?.pipe(Redacted.value),
            }),
          catch: (cause) => new OauthContract.RefreshError({ cause }),
        });

        if (result.err !== false)
          return yield* Match.value(result.err).pipe(
            Match.when(
              Match.instanceOf(InvalidAccessTokenError),
              (cause) => new OauthContract.InvalidAccessTokenError({ cause }),
            ),
            Match.when(
              Match.instanceOf(InvalidRefreshTokenError),
              (cause) => new OauthContract.InvalidRefreshTokenError({ cause }),
            ),
            Match.orElse((cause) => new OauthContract.RefreshError({ cause })),
          );

        const decode = Schema.decodeEffect(OauthContract.RefreshSuccess);

        return yield* decode(result).pipe(Effect.orDie);
      });

      const verify = Effect.fn(function* (token: Redacted.Redacted<string>, opts?: VerifyOptions) {
        const result = yield* Effect.tryPromise({
          try: () =>
            openauth.verify(OauthContract.subjects, token.pipe(Redacted.value), {
              ...opts,
              refresh: opts?.refresh?.pipe(Redacted.value),
            }),
          catch: (cause) => new OauthContract.VerifyError({ cause }),
        });

        if (result.err)
          return yield* Match.value(result.err).pipe(
            Match.when(
              Match.instanceOf(InvalidRefreshTokenError),
              (cause) => new OauthContract.InvalidRefreshTokenError({ cause }),
            ),
            Match.when(
              Match.instanceOf(InvalidAccessTokenError),
              (cause) => new OauthContract.InvalidAccessTokenError({ cause }),
            ),
            Match.orElse((cause) => new OauthContract.VerifyError({ cause })),
          );

        const decode = Schema.decodeEffect(OauthContract.VerifySuccess);

        return yield* decode(result).pipe(Effect.orDie);
      });

      const clientCredentials = Effect.fn(
        function* (credentials: OauthContract.ClientCredentials) {
          const request = yield* HttpClientRequest.post(new URL("/token", input.issuer)).pipe(
            HttpClientRequest.bodyUrlParams({
              grant_type: Constants.CLIENT_CREDENTIALS,
              provider: Constants.CLIENT_CREDENTIALS,
              client_id: credentials.id,
              client_secret: credentials.secret.pipe(Redacted.value),
            }),
            HttpClientRequest.toWeb,
          );

          const response = (yield* Effect.tryPromise((signal) =>
            (input.fetch || globalThis.fetch)(request, { signal }),
          )) as Response;

          const tokens = yield* HttpClientResponse.fromWeb(
            HttpClientRequest.fromWeb(request),
            response,
          ).pipe(HttpClientResponse.schemaBodyJson(OauthContract.Tokens));

          return { tokens } as const;
        },
        (effect) =>
          effect.pipe(
            Effect.mapError((error) => new OauthContract.ClientCredentialsError({ cause: error })),
          ),
      );

      return {
        authorize,
        exchange,
        refresh,
        verify,
        clientCredentials,
      } as const;
    }),
  }) {
    public static layer(...args: Parameters<typeof Openauth.make>) {
      return this.make(...args).pipe(Layer.effect(this));
    }

    public static runtime(...args: Parameters<typeof Openauth.layer>) {
      return this.layer(...args).pipe(ManagedRuntime.make);
    }
  }
}
