import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { PapercutContract } from "../papercut/contract";

export namespace PapercutApi {
  export class Group extends HttpApiGroup.make("Papercut")
    .add(
      HttpApiEndpoint.get("health", "/health", {
        success: PapercutContract.HealthSuccess,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .prefix("/papercut") {}
}
