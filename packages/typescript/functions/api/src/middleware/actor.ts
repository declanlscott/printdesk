import { ActorLayerMap } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { Oauth } from "@printdesk/core/oauth/client";
import { OauthContract } from "@printdesk/core/oauth/contract";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { openauthLayer } from "../lib/auth";

import type { Actor } from "@printdesk/core/actors";

export const actorMiddleware = HttpRouter.middleware<{ provides: Actor }>()(
  Effect.gen(function* () {
    const layerMap = yield* ActorLayerMap;
    const openauth = yield* Oauth.Openauth;

    return Effect.fn(
      function* (httpEffect) {
        const cookies = yield* OauthContract.Cookies.pipe(HttpServerRequest.schemaCookies);

        if ("accessToken" in cookies)
          return yield* openauth
            .verify(cookies.accessToken, { refresh: cookies.refreshToken })
            .pipe(
              Effect.flatMap((result) =>
                httpEffect.pipe(Effect.provide(layerMap.get(result.subject.properties.actor))),
              ),
            );

        return yield* httpEffect.pipe(Effect.provide(layerMap.get(ActorsContract.publicActor)));
      },
      (effect) =>
        effect.pipe(
          Effect.catchTags({
            SchemaError: (error) =>
              HttpServerResponse.text(error.message, { status: 400 }).pipe(Effect.succeed),
            InvalidAccessTokenError: (error) =>
              HttpServerResponse.text(error.message, { status: 401 }).pipe(Effect.succeed),
            InvalidRefreshTokenError: (error) =>
              HttpServerResponse.text(error.message, { status: 401 }).pipe(Effect.succeed),
            VerifyError: (error) =>
              HttpServerResponse.text(error.message, { status: 500 }).pipe(Effect.succeed),
          }),
        ),
    );
  }),
);

export const actorLayer = actorMiddleware.layer.pipe(
  Layer.provide(ActorLayerMap.layer),
  Layer.provide(openauthLayer),
);
