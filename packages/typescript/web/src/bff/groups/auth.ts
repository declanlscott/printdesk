import { ActorsContract } from "@printdesk/core/actors/contract";
import { Oauth } from "@printdesk/core/oauth/client";
import { OauthContract } from "@printdesk/core/oauth/contract";
import { TenantsContract } from "@printdesk/core/tenants/contract";
import { TenantSlug } from "@printdesk/core/tenants/slug";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { Bff } from "../contract";
import { AuthApi } from "../contract/groups/auth";
import { ViteResource } from "../lib/sst";

import type * as Cookies from "effect/unstable/http/Cookies";

export const tenantSlugValidatorLayer = Effect.gen(function* () {
  const resource = yield* ViteResource;

  const FromHostname = Schema.TemplateLiteralParser([
    TenantsContract.Slug,
    ".",
    resource.ApexDomain.pipe(Redacted.value).value,
  ]).pipe(
    Schema.decodeTo(TenantsContract.Slug, {
      decode: SchemaGetter.transform(Tuple.get(0)),
      encode: SchemaGetter.forbidden(() => "Not implemented"),
    }),
  );

  const FromQuery = Schema.Struct({ slug: TenantsContract.Slug }).pipe(
    Schema.encodeKeys({ slug: Constants.URL_PARAM_NAMES.TENANT_SLUG }),
    Schema.decodeTo(TenantsContract.Slug, {
      decode: SchemaGetter.transform(Struct.get("slug")),
      encode: SchemaGetter.forbidden(() => "Not implemented"),
    }),
  );

  return AuthApi.TenantSlugValidator.of(
    Effect.fn(
      function* (httpEffect) {
        if (resource.Environment.pipe(Redacted.value, (env) => !env.isDevMode && env.isProdStage))
          return yield* httpEffect.pipe(
            Effect.provideServiceEffect(
              TenantSlug,
              HttpServerRequest.HttpServerRequest.pipe(
                Effect.map((request) => new URL(request.originalUrl).hostname),
                Effect.flatMap(Schema.decodeUnknownEffect(FromHostname)),
              ),
            ),
          );

        return yield* httpEffect.pipe(
          Effect.provideServiceEffect(
            TenantSlug,
            FromQuery.pipe(HttpServerRequest.schemaSearchParams),
          ),
        );
      },
      (effect) => effect.pipe(Effect.catchTag("SchemaError", () => new HttpApiError.BadRequest())),
    ),
  );
}).pipe(Layer.effect(AuthApi.TenantSlugValidator));

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
    const openauth = yield* Oauth.Openauth;

    const cookieOptions = {
      httpOnly: true,
      maxAge: "52 weeks",
      path: "/",
      sameSite: "lax",
      secure: true,
    } satisfies Cookies.Cookie["options"];

    return handlers
      .handle("me", () =>
        OauthContract.AuthCookies.pipe(
          HttpServerRequest.schemaCookies,
          Effect.mapError((error) => new OauthContract.InvalidCookiesError({ cause: error })),
          Effect.flatMap((cookies) =>
            openauth.verify(cookies.accessToken, { refresh: cookies.refreshToken }),
          ),
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
          Effect.catchTag("CookieError", () => new HttpApiError.InternalServerError()),
        ),
      );
  }),
);

export const authGroupLayer = baseAuthGroupLayer.pipe(
  Layer.provide(
    ViteResource.useSync((resource) => resource.ApiGateway.pipe(Redacted.value).urls.auth).pipe(
      Effect.map((issuer) =>
        Oauth.Openauth.layer({ clientID: Constants.OPENAUTH_CLIENT_IDS.WEB, issuer }),
      ),
      Layer.unwrap,
    ),
  ),
  Layer.provide(tenantSlugValidatorLayer),
  Layer.provide(ViteResource.layer),
);
