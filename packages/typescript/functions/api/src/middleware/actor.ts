import { ActorLayerMap } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { Oauth } from "@printdesk/core/oauth/client";
import { OauthContract } from "@printdesk/core/oauth/contract";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
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
    const openauth = yield* Oauth.Openauth;

    return Effect.fn(function* (httpEffect) {
      const cookies = yield* OauthContract.Cookies.pipe(
        HttpServerRequest.schemaCookies,
        Effect.mapError((error) => new OauthContract.InvalidCookiesError({ cause: error })),
      );

      if ("access" in cookies)
        return yield* httpEffect.pipe(
          Effect.provide(
            openauth.verify(cookies.access).pipe(
              Effect.map((result) => layerMap.get(result.subject.properties.actor.wrap)),
              Layer.unwrap,
            ),
          ),
        );

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
