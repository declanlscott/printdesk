import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { RealtimeContract } from "../realtime/contract";

export namespace RealtimeApi {
  export const getAuthorization = HttpApiEndpoint.post("getAuthorization", "/authorization", {
    payload: RealtimeContract.AuthorizationPayload,
    success: RealtimeContract.AuthorizationSuccess,
    error: HttpApiError.InternalServerError,
  });

  export class Group extends HttpApiGroup.make("realtime")
    .add(getAuthorization)
    .prefix("/realtime") {}
}
