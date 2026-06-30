import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { Oauth } from "@printdesk/core/oauth";
import { PapercutApi } from "@printdesk/core/papercut/api";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { openauthLayer } from "../lib/auth";
import { papercutApiLayer } from "../lib/papercut";
import { authMiddleware } from "../middleware/auth";

export const basePapercutGroupLayer = HttpApiBuilder.group(
  Api,
  "Papercut",
  Effect.fn(function* (handlers) {
    const papercutApi = yield* PapercutApi;

    return handlers.handle(
      "health",
      Effect.fn("Api.Papercut.health")(() =>
        papercutApi.getTotalUsers.pipe(
          Effect.map(() => true),
          Effect.catchTags({
            HttpClientError: () => Effect.succeed(false),
            FaultError: () => Effect.succeed(false),
          }),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          Effect.map((healthy) => ({ healthy })),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_api_gateway:read")),
        ),
      ),
    );
  }),
);

export const papercutGroupLayer = basePapercutGroupLayer.pipe(
  Layer.provide([authMiddleware.layer, papercutApiLayer]),
  Layer.provide([ActorLayerMap.layer, Oauth.AccessTokenLayerMap.layer, openauthLayer]),
);
