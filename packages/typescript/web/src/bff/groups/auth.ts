import { Oauth } from "@printdesk/core/oauth/client";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as Cookies from "effect/unstable/http/Cookies";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { Bff } from "../contract";
import { ViteResource } from "../lib/sst";

export const baseAuthGroupLayer = HttpApiBuilder.group(
  Bff,
  "auth",
  Effect.fn(function* (handlers) {
    const openauth = yield* Oauth.Openauth;

    const redirectUri = (request: HttpServerRequest.HttpServerRequest) =>
      HttpServerRequest.toClientRequest(request).pipe(
        HttpClientRequest.updateUrl((url) => {
          const redirectUrl = new URL(url);
          redirectUrl.pathname = Constants.WEB_BFF_PATHS.oauthCallback;

          return redirectUrl.href;
        }),
        HttpClientRequest.toUrl,
        Effect.fromOption,
        Effect.orDie,
        Effect.map(Struct.get("href")),
      );

    const cookieOptions = {
      httpOnly: true,
      maxAge: "52 weeks",
      path: "/",
      sameSite: "lax",
      secure: true,
    } satisfies Cookies.Cookie["options"];

    return handlers
      .handle("login", ({ request }) =>
        redirectUri(request).pipe(
          Effect.flatMap((redirectUri) => openauth.authorize(redirectUri, "code")),
          Effect.catchTag("AuthorizeError", () => new HttpApiError.InternalServerError()),
          Effect.map(({ url }) => HttpServerResponse.redirect(url)),
        ),
      )
      .handle("oauth-callback", ({ request, query }) =>
        redirectUri(request).pipe(
          Effect.flatMap((redirectUri) => openauth.exchange(query.code, redirectUri)),
          Effect.flatMap(({ tokens }) =>
            HttpServerResponse.redirect(
              query.redirectUri ?? `${new URL(request.originalUrl).origin}/`,
            ).pipe(
              HttpServerResponse.setCookies([
                [
                  Constants.COOKIE_NAMES.ACCESS_TOKEN,
                  tokens.access.pipe(Redacted.value),
                  cookieOptions,
                ],
                [
                  Constants.COOKIE_NAMES.REFRESH_TOKEN,
                  tokens.refresh.pipe(Redacted.value),
                  cookieOptions,
                ],
              ]),
            ),
          ),
          Effect.catchTags({
            ExchangeError: () => new HttpApiError.InternalServerError(),
            CookieError: () => new HttpApiError.InternalServerError(),
          }),
        ),
      );
  }),
);

export const authGroupLayer = baseAuthGroupLayer.pipe(
  Layer.provide(
    ViteResource.useSync((resource) => resource.ReverseProxy.pipe(Redacted.value).urls.auth).pipe(
      Effect.map((issuer) =>
        Oauth.Openauth.layer({ clientID: Constants.OPENAUTH_CLIENT_IDS.WEB, issuer }),
      ),
      Layer.unwrap,
    ),
  ),
  Layer.provide(ViteResource.layer),
);
