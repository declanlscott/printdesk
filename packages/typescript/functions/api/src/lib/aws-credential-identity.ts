import { ActorLayerMap } from "@printdesk/core/actors";
import { AppconfigCredentialIdentityLayerMap } from "@printdesk/core/aws/credential-identity/appconfig";
import {
  AppsyncPublisherCredentialIdentityLayerMap,
  AppsyncSubscriberCredentialIdentityLayerMap,
} from "@printdesk/core/aws/credential-identity/appsync";
import { actorMiddleware } from "@printdesk/core/middleware/actor";
import { appconfigCredentialIdentityMiddleware } from "@printdesk/core/middleware/aws-credential-identity/appconfig";
import {
  appsyncPublisherCredentialIdentityMiddleware,
  appsyncSubscriberCredentialIdentityMiddleware,
} from "@printdesk/core/middleware/aws-credential-identity/appsync";
import * as Layer from "effect/Layer";

import { openauthLayer } from "./auth";

export const appconfigCredentialIdentityMiddlewareLayer = appconfigCredentialIdentityMiddleware
  .combine(actorMiddleware)
  .layer.pipe(
    Layer.provide([ActorLayerMap.layer, AppconfigCredentialIdentityLayerMap.layer, openauthLayer]),
  );

export const appsyncPublisherCredentialIdentityMiddlewareLayer =
  appsyncPublisherCredentialIdentityMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide([
        ActorLayerMap.layer,
        AppsyncPublisherCredentialIdentityLayerMap.layer,
        openauthLayer,
      ]),
    );

export const appsyncSubscriberCredentialIdentityMiddlewareLayer =
  appsyncSubscriberCredentialIdentityMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide([
        ActorLayerMap.layer,
        AppsyncSubscriberCredentialIdentityLayerMap.layer,
        openauthLayer,
      ]),
    );
