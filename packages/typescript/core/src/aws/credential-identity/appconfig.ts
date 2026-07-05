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

export const appconfigCredentialIdentityLayer = Effect.gen(function* () {
  const roleArnTemplate = yield* SstResource.useSync(
    (resource) => resource.AppconfigRoleTemplate.pipe(Redacted.value).arn,
  );

  return yield* Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(tenantTemplate(roleArnTemplate)),
    Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "Appconfig" })),
    Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
    Effect.map((params) =>
      AwsCredentialIdentity.providerLayer(() => fromTemporaryCredentials({ params })),
    ),
  );
}).pipe(Layer.unwrap);

export class AppconfigCredentialIdentityLayerMap extends LayerMap.Service<AppconfigCredentialIdentityLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppconfigLayerMap",
  {
    idleTimeToLive: Duration.minutes(15),
    dependencies: [ActorLayerMap.layer, SstResource.layer],
    lookup: (actor: typeof Actor.Service) =>
      appconfigCredentialIdentityLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
  },
) {}
