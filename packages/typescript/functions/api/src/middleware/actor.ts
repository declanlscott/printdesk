import { ActorLayerMap } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { Oauth } from "@printdesk/core/oauth/client";
import { OauthContract } from "@printdesk/core/oauth/contract";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Result from "effect/Result";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";

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

      if ("accessToken" in cookies)
        return yield* openauth
          .verify(cookies.accessToken, { refresh: cookies.refreshToken })
          .pipe(
            Effect.flatMap((result) =>
              httpEffect.pipe(Effect.provide(layerMap.get(result.subject.properties.actor))),
            ),
          );

      return yield* httpEffect.pipe(Effect.provide(layerMap.get(ActorsContract.publicActor)));
    });
  }),
).combine(
  HttpRouter.middleware<{
    handles:
      | OauthContract.InvalidCookiesError
      | OauthContract.InvalidAccessTokenError
      | OauthContract.InvalidRefreshTokenError
      | OauthContract.VerifyError;
  }>()((httpEffect) =>
    httpEffect.pipe(
      Effect.catchFilter(
        Filter.make((error) =>
          HttpServerRespondable.isRespondable(error) ? Result.succeed(error) : Result.fail(error),
        ),
        HttpServerRespondable.toResponse,
      ),
    ),
  ),
);
