import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actor, ActorLayerMap } from "../../actors";
import { AwsCredentialIdentity } from "../../aws/credential-identity";
import { SstResource } from "../../sst/resource";
import { tenantTemplate } from "../../utils";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";

export const appsyncPublisherCredentialIdentityLayer = Effect.gen(function* () {
  const roleArnTemplate = yield* SstResource.useSync(
    (resource) => resource.AppsyncChannelNamespacePublisherRoleTemplate.pipe(Redacted.value).arn,
  );

  return yield* Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(tenantTemplate(roleArnTemplate)),
    Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "AppsyncPublisher" })),
    Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
    Effect.map((params) =>
      AwsCredentialIdentity.providerLayer(() => fromTemporaryCredentials({ params })),
    ),
  );
}).pipe(Layer.unwrap);

export class AppsyncPublisherCredentialIdentityLayerMap extends LayerMap.Service<AppsyncPublisherCredentialIdentityLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppsyncPublisherLayerMap",
  {
    idleTimeToLive: Duration.minutes(15),
    dependencies: [ActorLayerMap.layer, SstResource.layer],
    lookup: (actor: typeof Actor.Service) =>
      appsyncPublisherCredentialIdentityLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
  },
) {}

export const appsyncSubscriberCredentialIdentityLayer = Effect.gen(function* () {
  const roleArnTemplate = yield* SstResource.useSync(
    (resource) => resource.AppsyncChannelNamespaceSubscriberRoleTemplate.pipe(Redacted.value).arn,
  );

  return yield* Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(tenantTemplate(roleArnTemplate)),
    Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "AppsyncSubscriber" })),
    Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
    Effect.map((params) =>
      AwsCredentialIdentity.providerLayer(() => fromTemporaryCredentials({ params })),
    ),
  );
}).pipe(Layer.unwrap);

export class AppsyncSubscriberCredentialIdentityLayerMap extends LayerMap.Service<AppsyncSubscriberCredentialIdentityLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppsyncSubscriberLayerMap",
  {
    idleTimeToLive: Duration.minutes(15),
    dependencies: [ActorLayerMap.layer, SstResource.layer],
    lookup: (actor: typeof Actor.Service) =>
      appsyncSubscriberCredentialIdentityLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
  },
) {}
