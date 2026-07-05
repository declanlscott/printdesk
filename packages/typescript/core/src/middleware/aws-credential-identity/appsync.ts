import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { Actor } from "../../actors";
import {
  AppsyncPublisherCredentialIdentityLayerMap,
  AppsyncSubscriberCredentialIdentityLayerMap,
} from "../../aws/credential-identity/appsync";
import { awsCredentialIdentityErrorMiddleware } from "./error";

import type { AwsCredentialIdentity } from "../../aws/credential-identity";

export const appsyncPublisherCredentialIdentityMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentity;
}>()(
  AppsyncPublisherCredentialIdentityLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityErrorMiddleware);

export const appsyncSubscriberCredentialIdentityMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentity;
}>()(
  AppsyncSubscriberCredentialIdentityLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityErrorMiddleware);
