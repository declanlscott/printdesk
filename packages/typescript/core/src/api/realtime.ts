import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { RealtimeContract } from "../realtime/contract";
import { AwsCredentialIdentityProviderMiddleware } from "./middleware/aws";

export namespace Realtime {
  export class Group extends HttpApiGroup.make("Realtime").add(
    HttpApiEndpoint.post("getAuthorization", "/authorization", {
      payload: RealtimeContract.AuthorizationPayload,
      success: RealtimeContract.AuthorizationSuccess,
    }).middleware(AwsCredentialIdentityProviderMiddleware),
  ) {}

  export class Api extends HttpApi.make("RealtimeApi").add(Group) {}
}
