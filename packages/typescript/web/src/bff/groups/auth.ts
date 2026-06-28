import { ActorsContract } from "@printdesk/core/actors/contract";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { TenantSlug } from "@printdesk/core/tenants/slug";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { Bff } from "../contract";
import { ViteResource } from "../lib/sst";
import { tenantSlugValidatorLayer } from "../middleware/tenant-slug-validator";

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

export const baseAuthGroupLayer = HttpApiBuilder.group(
  Bff,
  "auth",
  Effect.fn(function* (handlers) {
    const openauth = yield* Openauth.Openauth;

    return handlers
      .handle("me", () =>
        OauthContract.AuthCookies.pipe(
          HttpServerRequest.schemaCookies,
          Effect.mapError((error) => new OauthContract.InvalidCookiesError({ cause: error })),
          Effect.flatMap((tokens) => openauth.verify(tokens.accessToken)),
          Effect.flatMap((result) =>
            Match.valueTags(result.subject.properties.actor, {
              ClientActor: (client) =>
                new ActorsContract.ForbiddenActorError({ actor: client._tag }),
              UserActor: (user) => Effect.succeed(user),
            }),
          ),
        ),
      )
      .handle("login", ({ request }) =>
        redirectUri(request).pipe(
          Effect.flatMap((redirectUri) => openauth.authorize(redirectUri, "code")),
          Effect.flatMap(
            Effect.fn(function* ({ url }) {
              url.searchParams.set(Constants.URL_PARAM_NAMES.TENANT_SLUG, yield* TenantSlug);
              return HttpServerResponse.redirect(url);
            }),
          ),
        ),
      )
      .handle("oauth-callback", ({ request, query }) =>
        redirectUri(request).pipe(
          Effect.flatMap((redirectUri) => openauth.exchange(query.code, redirectUri)),
          Effect.flatMap(({ tokens }) =>
            HttpServerResponse.redirect(query.redirectUri).pipe(
              HttpServerResponse.setCookies([
                [
                  Constants.COOKIE_NAMES.ACCESS_TOKEN,
                  tokens.access.pipe(Redacted.value),
                  Constants.COOKIE_OPTIONS,
                ],
                [
                  Constants.COOKIE_NAMES.REFRESH_TOKEN,
                  tokens.refresh.pipe(Redacted.value),
                  Constants.COOKIE_OPTIONS,
                ],
              ]),
            ),
          ),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
        ),
      );
  }),
);

export const authGroupLayer = baseAuthGroupLayer.pipe(
  Layer.provide(
    ViteResource.useSync((resource) => resource.ApiGateway.pipe(Redacted.value).urls.auth).pipe(
      Effect.map((issuer) =>
        Openauth.Openauth.layer({ clientID: Constants.OPENAUTH_CLIENT_IDS.WEB, issuer }),
      ),
      Layer.unwrap,
    ),
  ),
  Layer.provide(tenantSlugValidatorLayer),
  Layer.provide(ViteResource.layer),
);
