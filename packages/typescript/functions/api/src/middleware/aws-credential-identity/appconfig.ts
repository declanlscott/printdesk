import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { Actor, ActorLayerMap } from "@printdesk/core/actors";
import { AwsCredentialIdentity } from "@printdesk/core/aws/credential-identity";
import { SstResource } from "@printdesk/core/sst/resource";
import { tenantTemplate } from "@printdesk/core/utils";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";
import * as Redacted from "effect/Redacted";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { openauthLayer } from "../../lib/auth";
import { actorMiddleware } from "../actor";
import { awsCredentialIdentityErrorMiddleware } from "./error";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";

export class AppconfigCredentialIdentityLayerMap extends LayerMap.Service<AppconfigCredentialIdentityLayerMap>()(
  "@printdesk/functions/api/aws/AppconfigCredentialIdentityLayerMap",
  {
    idleTimeToLive: Duration.minutes(15),
    dependencies: [SstResource.layer],
    lookup: Effect.fn(
      function* (actor: typeof Actor.Service) {
        const roleArnTemplate = yield* SstResource.useSync(
          (resource) => resource.AppconfigRoleTemplate.pipe(Redacted.value).arn,
        );

        return yield* actor.tenantId.pipe(
          Effect.map(tenantTemplate(roleArnTemplate)),
          Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "Appconfig" })),
          Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
          Effect.map((params) =>
            AwsCredentialIdentity.providerLayer(() => fromTemporaryCredentials({ params })),
          ),
        );
      },
      (effect) => effect.pipe(Layer.unwrap),
    ),
  },
) {}

export const appconfigAwsCredentialIdentityMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentity;
}>()(
  AppconfigCredentialIdentityLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityErrorMiddleware);

export const appconfigAwsCredentialIdentityLayer = appconfigAwsCredentialIdentityMiddleware
  .combine(actorMiddleware)
  .layer.pipe(
    Layer.provide([ActorLayerMap.layer, AppconfigCredentialIdentityLayerMap.layer, openauthLayer]),
  );
