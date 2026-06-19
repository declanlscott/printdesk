import { ActorLayerMap } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Cookies from "effect/unstable/http/Cookies";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import type { Actor } from "@printdesk/core/actors";

export const actorMiddleware = HttpRouter.middleware<{ provides: Actor }>()(
  Effect.gen(function* () {
    const layerMap = yield* ActorLayerMap;
    const openauth = yield* Openauth.Openauth;

    return Effect.fn(function* (httpEffect) {
      const cookies = yield* OauthContract.Cookies.pipe(
        HttpServerRequest.schemaCookies,
        Effect.mapError((error) => new OauthContract.InvalidCookiesError({ cause: error })),
      );

      if ("accessToken" in cookies) {
        const { subject, tokens } = yield* openauth.verify(cookies.accessToken, {
          refresh: cookies.refreshToken,
        });

        const providedHttpEffect = httpEffect.pipe(
          Effect.provide(layerMap.get(subject.properties.actor.wrap)),
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
      }

      return yield* httpEffect.pipe(
        Effect.provide(layerMap.get(ActorsContract.PublicActor.singleton.wrap)),
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
