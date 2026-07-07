import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Actor, ActorLayerMap } from "../../actors";
import { AwsCredentialIdentityProvider } from "../../aws/credential-identity";
import { SstResource } from "../../sst/resource";
import { tenantTemplate } from "../../utils";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";

export const appconfigCredentialIdentityProviderLayer = Effect.gen(function* () {
  const roleArnTemplate = yield* SstResource.useSync(
    (resource) => resource.AppconfigRoleTemplate.pipe(Redacted.value).arn,
  );

  return yield* Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(tenantTemplate(roleArnTemplate)),
    Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "Appconfig" })),
    Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
    Effect.map((params) =>
      AwsCredentialIdentityProvider.providerLayer(() => fromTemporaryCredentials({ params })),
    ),
  );
}).pipe(Layer.unwrap);

export class AppconfigCredentialIdentityProviderLayerMap extends LayerMap.Service<AppconfigCredentialIdentityProviderLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppconfigProviderLayerMap",
  {
    dependencies: [ActorLayerMap.layer, SstResource.layer],
    lookup: (actor: typeof Actor.Service) =>
      appconfigCredentialIdentityProviderLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
  },
) {}
