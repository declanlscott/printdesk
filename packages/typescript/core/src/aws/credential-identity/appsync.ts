import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";

import { AwsCredentialIdentityProvider } from ".";
import { Actor, ActorLayerMap } from "../../actors";
import { Constants } from "../../utils/constants";
import { AppsyncPublisherRole, AppsyncSubscriberRole } from "../appsync/roles";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";

export const appsyncPublisherCredentialIdentityProviderLayer = AppsyncPublisherRole.arn.pipe(
  Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "AppsyncPublisher" })),
  Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
  Effect.map((params) =>
    AwsCredentialIdentityProvider.layerFromProvider(() => fromTemporaryCredentials({ params })),
  ),
  Layer.unwrap,
);

export class AppsyncPublisherCredentialIdentityProviderLayerMap extends LayerMap.Service<AppsyncPublisherCredentialIdentityProviderLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppsyncPublisherProviderLayerMap",
  {
    dependencies: [ActorLayerMap.layer],
    lookup: (actor: typeof Actor.Service) =>
      appsyncPublisherCredentialIdentityProviderLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
    idleTimeToLive: Constants.DEFAULT_LAYER_MAP_IDLE_TTL,
  },
) {}

export const appsyncSubscriberCredentialIdentityProviderLayer = AppsyncSubscriberRole.arn.pipe(
  Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "AppsyncSubscriber" })),
  Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
  Effect.map((params) =>
    AwsCredentialIdentityProvider.layerFromProvider(() => fromTemporaryCredentials({ params })),
  ),
  Layer.unwrap,
);

export class AppsyncSubscriberCredentialIdentityProviderLayerMap extends LayerMap.Service<AppsyncSubscriberCredentialIdentityProviderLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppsyncSubscriberProviderLayerMap",
  {
    dependencies: [ActorLayerMap.layer],
    lookup: (actor: typeof Actor.Service) =>
      appsyncSubscriberCredentialIdentityProviderLayer.pipe(
        Layer.provide(ActorLayerMap.get(actor)),
      ),
    idleTimeToLive: Constants.DEFAULT_LAYER_MAP_IDLE_TTL,
  },
) {}
