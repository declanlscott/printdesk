import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
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
    .setHeaders(ReplicachePullerContract.Headers)
    .setPayload(ReplicachePullerContract.Payload)
    .addSuccess(ReplicachePullerContract.Success, { status: 200 })
    .addError(HttpApiError.HttpApiDecodeError)
    .addError(AccessControl.AccessDeniedError)
    .addError(ActorsContract.ForbiddenActorError)
    .addError(DatabaseContract.TransactionError)
    .addError(DatabaseContract.QueryBuilderError)
    .addError(QueriesContract.DifferenceLimitExceededError)
    .addError(HttpApiError.InternalServerError);

  export const push = HttpApiEndpoint.post("push", "/push")
    .setHeaders(ReplicachePusherContract.Headers)
    .setPayload(ReplicachePusherContract.Payload)
    .addSuccess(ReplicachePusherContract.Success, { status: 200 })
    .addError(HttpApiError.HttpApiDecodeError)
    .addError(AccessControl.AccessDeniedError)
    .addError(ActorsContract.ForbiddenActorError)
    .addError(DatabaseContract.TransactionError)
    .addError(ReplicachePusherContract.FutureMutationError)
    .addError(HttpApiError.InternalServerError);

  export class Group extends HttpApiGroup.make("replicache")
    .add(push)
    .middlewareEndpoints(CredentialsApi.Identity)
    .add(pull)
    .middleware(ActorsApi.Actor) {}
}
