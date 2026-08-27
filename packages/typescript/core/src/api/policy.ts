import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { ActorsContract } from "../actors/contract";
import { PoliciesContract } from "../policies/contract";

export namespace Policy {
  export class Group extends HttpApiGroup.make("Policy").add(
    HttpApiEndpoint.get("query", "/query", {
      query: PoliciesContract.QueryParameters,
      success: PoliciesContract.QuerySuccess,
      error: [ActorsContract.ForbiddenActorError],
    }),
  ) {}

  export class Api extends HttpApi.make("PolicyApi").add(Group) {}
}
