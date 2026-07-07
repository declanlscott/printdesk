import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { Actor } from "../../actors";
import { AwsCredentialIdentityProvider } from "../../aws/credential-identity";
import { AppconfigCredentialIdentityProviderLayerMap } from "../../aws/credential-identity/appconfig";
import { awsCredentialIdentityProviderErrorMiddleware } from "./error";

export const appconfigCredentialIdentityProviderMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentityProvider;
}>()(
  AppconfigCredentialIdentityProviderLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityProviderErrorMiddleware);
