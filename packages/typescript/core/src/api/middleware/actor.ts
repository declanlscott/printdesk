import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";

import { ActorLayerMap } from "../../actors";
import { ActorsContract } from "../../actors/contract";
import { OauthContract } from "../../oauth/contract";
import { Openauth } from "../../oauth/openauth";
import { Constants } from "../../utils/constants";

import type { Actor } from "../../actors";

export class ActorMiddleware extends HttpApiMiddleware.Service<
  ActorMiddleware,
  { provides: Actor }
>()("@printdesk/core/api/ActorMiddleware", {
  error: [
    OauthContract.InvalidCookiesError,
    OauthContract.InvalidAccessTokenError,
    OauthContract.InvalidRefreshTokenError,
    OauthContract.VerifyError,
  ],
}) {
  public static readonly make = Effect.gen({ self: this }, function* () {
    const layerMap = yield* ActorLayerMap;
    const openauth = yield* Openauth;

    return this.of(
      Effect.fn(function* (httpEffect) {
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
            Effect.orDie,
          );
        }

        return yield* httpEffect.pipe(
          Effect.provide(layerMap.get(ActorsContract.PublicActor.singleton.wrap)),
        );
      }),
    );
  });

  public static readonly layer = this.make.pipe(Layer.effect(this));
}
