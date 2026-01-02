import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";

import { RealtimeContract } from "./contract";

export namespace RealtimeApi {
  export const getUrl = HttpApiEndpoint.get("getUrl", "/url")
    .addSuccess(RealtimeContract.Url)
    .addError(HttpApiError.InternalServerError);

  export const getAuthorization = HttpApiEndpoint.get(
    "getAuthorization",
    "/authorization",
  )
    .setPayload(RealtimeContract.GetAuthorizationPayload)
    .addSuccess(RealtimeContract.Authorization)
    .addError(HttpApiError.InternalServerError);

  export class Group extends HttpApiGroup.make("realtime")
    .add(getUrl)
    .add(getAuthorization) {}
}
