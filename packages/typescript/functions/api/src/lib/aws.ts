import { ActorLayerMap } from "@printdesk/core/actors";
import { AppconfigCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appconfig";
import {
  AppsyncPublisherCredentialIdentityProviderLayerMap,
  AppsyncSubscriberCredentialIdentityProviderLayerMap,
} from "@printdesk/core/aws/credential-identity/appsync";
import { actorMiddleware } from "@printdesk/core/middleware/actor";
import { appconfigCredentialIdentityProviderMiddleware } from "@printdesk/core/middleware/aws/appconfig";
import {
  appsyncPublisherCredentialIdentityProviderMiddleware,
  appsyncSubscriberCredentialIdentityProviderMiddleware,
} from "@printdesk/core/middleware/aws/appsync";
import * as Layer from "effect/Layer";

import { openauthLayer } from "./auth";

export const appconfigCredentialIdentityProviderMiddlewareLayer =
  appconfigCredentialIdentityProviderMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide([
        ActorLayerMap.layer,
        AppconfigCredentialIdentityProviderLayerMap.layer,
        openauthLayer,
      ]),
    );

export const appsyncPublisherCredentialIdentityProviderMiddlewareLayer =
  appsyncPublisherCredentialIdentityProviderMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide([
        ActorLayerMap.layer,
        AppsyncPublisherCredentialIdentityProviderLayerMap.layer,
        openauthLayer,
      ]),
    );

export const appsyncSubscriberCredentialIdentityProviderMiddlewareLayer =
  appsyncSubscriberCredentialIdentityProviderMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide([
        ActorLayerMap.layer,
        AppsyncSubscriberCredentialIdentityProviderLayerMap.layer,
        openauthLayer,
      ]),
    );
