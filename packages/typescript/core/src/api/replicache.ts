import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { ReplicachePullerContract, ReplicachePusherContract } from "../replicache/contracts";

export namespace ReplicacheApi {
  export const pull = HttpApiEndpoint.post("pull", "/pull", {
    headers: ReplicachePullerContract.Headers,
    payload: ReplicachePullerContract.Payload,
    success: ReplicachePullerContract.Success,
    error: [AccessControl.AccessDeniedError, ActorsContract.ForbiddenActorError],
  });

  export const push = HttpApiEndpoint.post("push", "/push", {
    headers: ReplicachePusherContract.Headers,
    payload: ReplicachePusherContract.Payload,
    success: ReplicachePusherContract.Success,
    error: [
      AccessControl.AccessDeniedError,
      ActorsContract.ForbiddenActorError,
      ReplicachePusherContract.FutureMutationError,
    ],
  });

  export class Group extends HttpApiGroup.make("Replicache")
    .add(pull)
    .add(push)
    .prefix("/replicache") {}
}
