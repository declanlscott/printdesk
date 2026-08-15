import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";

import { ActorLayerMap, type Actor } from "../../actors";
import { Oauth } from "../../oauth";
import { OauthContract } from "../../oauth/contract";
import { Openauth } from "../../oauth/openauth";
import { Constants } from "../../utils/constants";

export class AuthMiddleware extends HttpApiMiddleware.Service<
  AuthMiddleware,
  { provides: Actor | Oauth.AccessToken }
>()("@printdesk/core/api/AuthMiddleware", {
  error: [
    OauthContract.InvalidCookiesError,
    OauthContract.InvalidAccessTokenError,
    OauthContract.InvalidRefreshTokenError,
    OauthContract.VerifyError,
  ],
}) {
  public static readonly make = Effect.gen({ self: this }, function* () {
    const actorLayerMap = yield* ActorLayerMap;
    const accessTokenLayerMap = yield* Oauth.AccessTokenLayerMap;
    const openauth = yield* Openauth;

    return this.of(
      Effect.fn(function* (httpEffect) {
        const cookies = yield* OauthContract.AuthCookies.pipe(
          HttpServerRequest.schemaCookies,
          Effect.mapError((error) => new OauthContract.InvalidCookiesError({ cause: error })),
        );

        const { subject, tokens } = yield* openauth.verify(cookies.accessToken, {
          refresh: cookies.refreshToken,
        });

        const providedHttpEffect = httpEffect.pipe(
          // oxlint-disable-next-line effecttsgo/strict-effect-provide
          Effect.provide(
            Layer.mergeAll(
              actorLayerMap.get(subject.properties.actor.wrap),
              accessTokenLayerMap.get(
                tokens.pipe(
                  Option.map(Struct.get("access")),
                  Option.getOrElse(() => cookies.accessToken),
                ),
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
          Effect.orDie,
        );
      }),
    );
  });

  public static readonly layer = this.make.pipe(Layer.effect(this));
}
