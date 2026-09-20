import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";

import { AwsCredentialIdentityProvider } from ".";
import { Actor, ActorLayerMap } from "../../actors";
import { Constants } from "../../utils/constants";
import { AppconfigRole } from "../appconfig/role";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";

export const appconfigCredentialIdentityProviderLayer = AppconfigRole.arn.pipe(
  Effect.map((RoleArn) => ({ RoleArn, RoleSessionName: "Appconfig" })),
  Effect.satisfiesSuccessType<FromTemporaryCredentialsOptions["params"]>(),
  Effect.map((params) =>
    AwsCredentialIdentityProvider.layerFromProvider(() => fromTemporaryCredentials({ params })),
  ),
  Layer.unwrap,
);

export class AppconfigCredentialIdentityProviderLayerMap extends LayerMap.Service<AppconfigCredentialIdentityProviderLayerMap>()(
  "@printdesk/core/aws/credential-identity/AppconfigProviderLayerMap",
  {
    dependencies: [ActorLayerMap.layer],
    lookup: (actor: typeof Actor.Service) =>
      appconfigCredentialIdentityProviderLayer.pipe(Layer.provide(ActorLayerMap.get(actor))),
    idleTimeToLive: Constants.DEFAULT_LAYER_MAP_IDLE_TTL,
  },
) {
  public static readonly provide = this.pipe(
    Effect.map((layerMap) =>
      // oxlint-disable-next-line effecttsgo/strict-effect-provide
      Effect.provide(
        Actor.pipe(
          Effect.map((actor) => layerMap.get(actor)),
          Layer.unwrap,
        ),
      ),
    ),
  );
}
