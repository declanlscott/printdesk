import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
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
    OauthContract.MultipleAuthenticationMethodsError,
    OauthContract.InvalidCookiesError,
    OauthContract.InvalidHeadersError,
    OauthContract.InvalidAccessTokenError,
    OauthContract.InvalidRefreshTokenError,
    OauthContract.VerifyError,
    HttpApiError.Unauthorized,
  ],
}) {
  public static readonly make = Effect.gen({ self: this }, function* () {
    const actorLayerMap = yield* ActorLayerMap;
    const accessTokenLayerMap = yield* Oauth.AccessTokenLayerMap;
    const openauth = yield* Openauth;

    return this.of(
      Effect.fn(function* (httpEffect) {
        const { subject, tokens, fallbackToken, method } = yield* Effect.all({
          cookies: HttpServerRequest.HttpServerRequest.pipe(
            Effect.map(Struct.get("cookies")),
            Effect.map(
              Option.liftPredicate((cookies) =>
                Schema.toEncoded(OauthContract.AuthCookies)
                  .schema.from.mapFields(Struct.omit(["_tag"]))
                  .pipe(
                    Struct.get("fields"),
                    Struct.keys,
                    Array.every((key) => key in cookies),
                  ),
              ),
            ),
          ),
          headers: HttpServerRequest.HttpServerRequest.pipe(
            Effect.map(Struct.get("headers")),
            Effect.map(
              Option.liftPredicate((headers) =>
                Schema.toEncoded(OauthContract.AuthHeaders)
                  .schema.from.mapFields(Struct.omit(["_tag"]))
                  .pipe(
                    Struct.get("fields"),
                    Struct.keys,
                    Array.every((key) => key in headers),
                  ),
              ),
            ),
          ),
        }).pipe(
          Effect.flatMap(
            Effect.fn(function* (method) {
              if (Option.product(method.cookies, method.headers))
                return yield* new OauthContract.MultipleAuthenticationMethodsError();

              if (Option.isSome(method.cookies))
                return yield* method.cookies.pipe(
                  Option.getOrThrow,
                  Schema.decodeUnknownEffect(OauthContract.AuthCookies),
                  Effect.mapError(
                    (error) => new OauthContract.InvalidCookiesError({ cause: error }),
                  ),
                  Effect.flatMap((cookies) =>
                    openauth.verify(cookies.accessToken, { refresh: cookies.refreshToken }).pipe(
                      Effect.map(
                        Struct.assign({
                          fallbackToken: cookies.accessToken,
                          method: "cookies" as const,
                        }),
                      ),
                    ),
                  ),
                );

              if (Option.isSome(method.headers))
                return yield* method.headers.pipe(
                  Option.getOrThrow,
                  Schema.decodeUnknownEffect(OauthContract.AuthHeaders),
                  Effect.mapError(
                    (error) => new OauthContract.InvalidHeadersError({ cause: error }),
                  ),
                  Effect.flatMap((headers) =>
                    openauth.verify(headers.accessToken).pipe(
                      Effect.map(
                        Struct.assign({
                          fallbackToken: headers.accessToken,
                          method: "headers" as const,
                        }),
                      ),
                    ),
                  ),
                );

              return yield* new HttpApiError.Unauthorized();
            }),
          ),
        );

        const providedHttpEffect = httpEffect.pipe(
          // oxlint-disable-next-line effecttsgo/strict-effect-provide
          Effect.provide(
            Layer.mergeAll(
              actorLayerMap.get(subject.properties.actor.wrap),
              accessTokenLayerMap.get(
                tokens.pipe(
                  Option.map(Struct.get("access")),
                  Option.getOrElse(() => fallbackToken),
                ),
              ),
            ),
          ),
        );

        if (Option.isNone(tokens) || method !== "cookies") return yield* providedHttpEffect;

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
