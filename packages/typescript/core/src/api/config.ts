import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { ConfigContract } from "../config/contract";

export namespace ConfigApi {
  export class PapercutGroup extends HttpApiGroup.make("PapercutConfig")
    .add(
      HttpApiEndpoint.post("setApiAuthToken", "/api-auth-token", {
        payload: ConfigContract.SetPapercutApiAuthTokenPayload,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .prefix("/config/papercut") {}
}
