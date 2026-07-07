import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { Actor } from "../../actors";
import {
  AppsyncPublisherCredentialIdentityProviderLayerMap,
  AppsyncSubscriberCredentialIdentityProviderLayerMap,
} from "../../aws/credential-identity/appsync";
import { awsCredentialIdentityProviderErrorMiddleware } from "./error";

import type { AwsCredentialIdentityProvider } from "../../aws/credential-identity";

export const appsyncPublisherCredentialIdentityProviderMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentityProvider;
}>()(
  AppsyncPublisherCredentialIdentityProviderLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityProviderErrorMiddleware);

export const appsyncSubscriberCredentialIdentityProviderMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentityProvider;
}>()(
  AppsyncSubscriberCredentialIdentityProviderLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityProviderErrorMiddleware);
