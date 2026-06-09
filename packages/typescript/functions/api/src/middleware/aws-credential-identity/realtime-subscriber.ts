import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { Actor, ActorLayerMap } from "@printdesk/core/actors";
import { AwsCredentialIdentity } from "@printdesk/core/aws/credential-identity";
import { SstResource } from "@printdesk/core/sst/resource";
import { tenantTemplate } from "@printdesk/core/utils";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { openauthLayer } from "../../lib/auth";
import { actorMiddleware } from "../actor";
import { awsCredentialIdentityErrorMiddleware } from "./error";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";

export class RealtimeSubscriberAwsCredentialIdentityLayerMap extends LayerMap.Service<RealtimeSubscriberAwsCredentialIdentityLayerMap>()(
  "@printdesk/functions/api/aws/RealtimeSubscriberCredentialIdentityLayerMap",
  {
    idleTimeToLive: Duration.minutes(15),
    dependencies: [SstResource.layer],
    lookup: Effect.fn(
      function* (actor: typeof Actor.Service.properties) {
        const {
          RealtimePublicChannelNamespaceSubscriberRole,
          RealtimeTenantChannelNamespaceSubscriberRoleTemplate,
        } = yield* SstResource;

        return Match.value(actor).pipe(
          Match.tag("PublicActor", () => ({
            RoleArn: RealtimePublicChannelNamespaceSubscriberRole.pipe(Redacted.value).arn,
            RoleSessionName: "PublicRealtimeSubscriber",
          })),
          Match.orElse(({ tenantId }) => ({
            RoleArn: tenantTemplate(
              RealtimeTenantChannelNamespaceSubscriberRoleTemplate.pipe(Redacted.value).name,
              tenantId,
            ),
            RoleSessionName: "TenantRealtimeSubscriber",
          })),
        );
      },
      (effect) =>
        effect.pipe(
          Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
          Effect.map((params) =>
            AwsCredentialIdentity.providerLayer(() => fromTemporaryCredentials({ params })),
          ),
          Layer.unwrap,
        ),
    ),
  },
) {}

export const realtimeSubscriberAwsCredentialIdentityMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentity;
}>()(
  RealtimeSubscriberAwsCredentialIdentityLayerMap.pipe(
    Effect.map((layerMap) =>
      Effect.provide(
        Actor.pipe(Effect.map(Struct.get("properties")), Effect.map(layerMap.get), Layer.unwrap),
      ),
    ),
  ),
).combine(awsCredentialIdentityErrorMiddleware);

export const realtimeSubscriberAwsCredentialIdentityLayer =
  realtimeSubscriberAwsCredentialIdentityMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide(ActorLayerMap.layer),
      Layer.provide(RealtimeSubscriberAwsCredentialIdentityLayerMap.layer),
      Layer.provide(openauthLayer),
    );
