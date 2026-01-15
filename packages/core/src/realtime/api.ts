import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";

import { ActorsApi } from "../actors/api";
import { CredentialsApi } from "../aws/api";
import { RealtimeContract } from "./contract";

export namespace RealtimeApi {
  export const getAuthorization = HttpApiEndpoint.get(
    "getAuthorization",
    "/authorization",
  )
    .setPayload(RealtimeContract.GetAuthorizationPayload)
    .addSuccess(RealtimeContract.Authorization)
    .addError(HttpApiError.InternalServerError);

  export const getUrl = HttpApiEndpoint.get("getUrl", "/url")
    .addSuccess(RealtimeContract.Url)
    .addError(HttpApiError.InternalServerError);

  export class Group extends HttpApiGroup.make("realtime")
    .add(getAuthorization)
    .middlewareEndpoints(CredentialsApi.Identity)
    .add(getUrl)
    .middleware(ActorsApi.Actor) {}
}
