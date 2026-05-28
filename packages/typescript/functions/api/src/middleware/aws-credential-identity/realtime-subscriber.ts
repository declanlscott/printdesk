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
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { openauthLayer } from "../../lib/auth";
import { actorMiddleware } from "../actor";

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
  Effect.gen(function* () {
    const layerMap = yield* RealtimeSubscriberAwsCredentialIdentityLayerMap;

    return Effect.fn(function* (httpEffect) {
      const actor = yield* Actor;

      return yield* httpEffect.pipe(
        Effect.provide(layerMap.get(actor.properties).pipe(Layer.orDie)),
      );
    });
  }),
);

export const realtimeSubscriberAwsCredentialIdentityLayer =
  realtimeSubscriberAwsCredentialIdentityMiddleware
    .combine(actorMiddleware)
    .layer.pipe(
      Layer.provide(ActorLayerMap.layer),
      Layer.provide(RealtimeSubscriberAwsCredentialIdentityLayerMap.layer),
      Layer.provide(openauthLayer),
    );
