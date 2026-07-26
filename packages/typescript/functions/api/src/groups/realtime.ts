import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { ActorMiddleware } from "@printdesk/core/api/middleware/actor";
import { AwsCredentialIdentityProviderMiddleware } from "@printdesk/core/api/middleware/aws";
import { AppsyncSubscriberCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appsync";
import { Realtime } from "@printdesk/core/realtime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { openauthLayer } from "../lib/auth";
import { realtimeLayer } from "../lib/realtime";

export const baseRealtimeGroupLayer = HttpApiBuilder.group(
  Api,
  "Realtime",
  Effect.fn(function* (handlers) {
    const realtime = yield* Realtime;

    return handlers.handle(
      "getAuthorization",
      Effect.fn("Api.Realtime.getAuthorization")(({ payload }) =>
        realtime.getAuthorization(payload).pipe(Effect.orDie),
      ),
    );
  }),
);

export const realtimeGroupLayer = baseRealtimeGroupLayer.pipe(
  Layer.provide([
    ActorMiddleware.layer,
    AwsCredentialIdentityProviderMiddleware.appsyncSubscriberLayer,
    realtimeLayer,
  ]),
  Layer.provide([
    ActorLayerMap.layer,
    AppsyncSubscriberCredentialIdentityProviderLayerMap.layer,
    openauthLayer,
  ]),
);
