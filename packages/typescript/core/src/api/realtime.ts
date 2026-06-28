import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { RealtimeContract } from "../realtime/contract";

export namespace RealtimeApi {
  export const getAuthorization = HttpApiEndpoint.post("getAuthorization", "/authorization", {
    payload: RealtimeContract.AuthorizationPayload,
    success: RealtimeContract.AuthorizationSuccess,
  });

  export class Group extends HttpApiGroup.make("Realtime")
    .add(getAuthorization)
    .prefix("/realtime") {}
}
