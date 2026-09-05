import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { ConfigContract } from "../config/contract";
import { AwsCredentialIdentityProviderMiddleware } from "./middleware/aws";

export namespace Config {
  export class PapercutMf extends HttpApiGroup.make("PapercutMfConfig")
    .add(
      HttpApiEndpoint.post("setApiAuthToken", "/api-auth-token", {
        payload: ConfigContract.SetPapercutMfApiAuthTokenPayload,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .prefix("/papercut/mf") {}

  export class Api extends HttpApi.make("ConfigApi")
    .add(PapercutMf)
    .middleware(AwsCredentialIdentityProviderMiddleware) {}
}
