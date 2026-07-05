import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";

import { Actor } from "../../actors";
import { AwsCredentialIdentity } from "../../aws/credential-identity";
import { AppconfigCredentialIdentityLayerMap } from "../../aws/credential-identity/appconfig";
import { awsCredentialIdentityErrorMiddleware } from "./error";

export const appconfigCredentialIdentityMiddleware = HttpRouter.middleware<{
  provides: AwsCredentialIdentity;
}>()(
  AppconfigCredentialIdentityLayerMap.pipe(
    Effect.map((layerMap) => Effect.provide(Actor.pipe(Effect.map(layerMap.get), Layer.unwrap))),
  ),
).combine(awsCredentialIdentityErrorMiddleware);
