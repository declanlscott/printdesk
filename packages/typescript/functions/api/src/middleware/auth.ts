import { ActorLayerMap } from "@printdesk/core/actors";
import { Oauth } from "@printdesk/core/oauth";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";
import * as Cookies from "effect/unstable/http/Cookies";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import type { Actor } from "@printdesk/core/actors";

export const authMiddleware = HttpRouter.middleware<{ provides: Actor | Oauth.AccessToken }>()(
  Effect.gen(function* () {
    const actorLayerMap = yield* ActorLayerMap;
    const accessTokenLayerMap = yield* Oauth.AccessTokenLayerMap;
    const openauth = yield* Openauth.Openauth;

    return Effect.fn(function* (httpEffect) {
      const cookies = yield* OauthContract.AuthCookies.pipe(
        HttpServerRequest.schemaCookies,
        Effect.mapError((error) => new OauthContract.InvalidCookiesError({ cause: error })),
      );

      const { subject, tokens } = yield* openauth.verify(cookies.accessToken, {
        refresh: cookies.refreshToken,
      });

      const providedHttpEffect = httpEffect.pipe(
        Effect.provide(actorLayerMap.get(subject.properties.actor.wrap)),
        Effect.provide(
          accessTokenLayerMap.get(
            tokens.pipe(
              Option.map(Struct.get("access")),
              Option.getOrElse(() => cookies.accessToken),
            ),
          ),
        ),
      );

      if (Option.isNone(tokens)) return yield* providedHttpEffect;

      return yield* providedHttpEffect.pipe(
        Effect.flatMap(
          HttpServerResponse.setCookies([
            [
              Constants.COOKIE_NAMES.ACCESS_TOKEN,
              tokens.value.access.pipe(Redacted.value),
              Constants.COOKIE_OPTIONS,
            ],
            [
              Constants.COOKIE_NAMES.REFRESH_TOKEN,
              tokens.value.refresh.pipe(Redacted.value),
              Constants.COOKIE_OPTIONS,
            ],
          ]),
        ),
      );
    });
  }),
).combine(
  HttpRouter.middleware<{
    handles:
      | Cookies.CookiesError
      | OauthContract.InvalidCookiesError
      | OauthContract.InvalidAccessTokenError
      | OauthContract.InvalidRefreshTokenError
      | OauthContract.VerifyError;
  }>()((httpEffect) =>
    httpEffect.pipe(
      Effect.catchTag("CookieError", () =>
        HttpServerResponse.empty({ status: 500 }).pipe(Effect.succeed),
      ),
      Effect.catchFilter(
        Filter.make((error) =>
          HttpServerRespondable.isRespondable(error) ? Result.succeed(error) : Result.fail(error),
        ),
        HttpServerRespondable.toResponse,
      ),
    ),
  ),
);
