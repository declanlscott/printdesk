import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control";
import { ActorsApi } from "../actors/api";
import { ActorsContract } from "../actors/contract";
import { CredentialsApi } from "../aws/api";
import { DatabaseContract } from "../database/contract";
import {
  ReplicachePullerContract,
  ReplicachePusherContract,
} from "./contracts";

export namespace ReplicacheApi {
  export const pull = HttpApiEndpoint.post("pull", "/pull")
    .setHeaders(ReplicachePullerContract.Headers)
    .setPayload(ReplicachePullerContract.Payload)
    .addSuccess(ReplicachePullerContract.Success)
    .addError(AccessControl.AccessDeniedError)
    .addError(ActorsContract.ForbiddenActorError)
    .addError(DatabaseContract.TransactionError)
    .addError(DatabaseContract.QueryBuilderError)
    .addError(HttpApiError.InternalServerError);

  export const push = ReplicachePusherContract.Payload.pipe(
    Effect.map((payload) =>
      HttpApiEndpoint.post("push", "/push")
        .setHeaders(ReplicachePusherContract.Headers)
        .setPayload(payload)
        .addSuccess(ReplicachePusherContract.Success)
        .addError(AccessControl.AccessDeniedError)
        .addError(ActorsContract.ForbiddenActorError)
        .addError(DatabaseContract.TransactionError)
        .addError(ReplicachePusherContract.FutureMutationError)
        .addError(HttpApiError.InternalServerError),
    ),
  );

  export const group = push.pipe(
    Effect.map((push) =>
      HttpApiGroup.make("replicache")
        .add(push)
        .middlewareEndpoints(CredentialsApi.Identity)
        .add(pull)
        .middleware(ActorsApi.Actor)
        .prefix("/replicache"),
    ),
  );
}
