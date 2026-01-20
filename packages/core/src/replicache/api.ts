import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsApi } from "../actors/api";
import { ActorsContract } from "../actors/contract";
import { CredentialsApi } from "../aws/api";
import { DatabaseContract } from "../database/contract";
import { QueriesContract } from "../queries/contract";
import {
  ReplicachePullerContract,
  ReplicachePusherContract,
} from "./contracts";

export namespace ReplicacheApi {
  export const pull = HttpApiEndpoint.post("pull", "/pull")
    .setPayload(ReplicachePullerContract.Request)
    .addSuccess(ReplicachePullerContract.Response)
    .addError(AccessControl.AccessDeniedError)
    .addError(ActorsContract.ForbiddenActorError)
    .addError(DatabaseContract.TransactionError)
    .addError(DatabaseContract.QueryBuilderError)
    .addError(QueriesContract.DifferenceLimitExceededError);

  export const push = HttpApiEndpoint.post("push", "/push")
    .setPayload(ReplicachePusherContract.Request)
    .addSuccess(ReplicachePusherContract.Response)
    .addError(AccessControl.AccessDeniedError)
    .addError(ActorsContract.ForbiddenActorError)
    .addError(DatabaseContract.TransactionError)
    .addError(ReplicachePusherContract.FutureMutationError);

  export class Group extends HttpApiGroup.make("replicache")
    .add(push)
    .middlewareEndpoints(CredentialsApi.Identity)
    .add(pull)
    .middleware(ActorsApi.Actor) {}
}
