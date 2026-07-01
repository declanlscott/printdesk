import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { PapercutContract } from "../papercut/contract";

export namespace PapercutApi {
  export class Group extends HttpApiGroup.make("Papercut")
    .add(
      HttpApiEndpoint.get("health", "/health", {
        success: PapercutContract.HealthSuccess,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .add(
      HttpApiEndpoint.get("taskStatus", "/task-status", {
        success: PapercutContract.TaskStatusSuccess,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .prefix("/papercut") {}

  export class SyncGroup extends HttpApiGroup.make("PapercutSync")
    .add(
      HttpApiEndpoint.post("source", "/source", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutContract.IncompleteTaskStatusError,
          PapercutContract.UserAndGroupSyncFailure,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("all", "/", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("customerGroups", "/customer-groups", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("customerGroupMemberships", "/customer-group-memberships", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("sharedAccounts", "/shared-accounts", {
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .add(
      HttpApiEndpoint.post("sharedAccountCustomerAccess", "/shared-account-customer-access", {
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .add(
      HttpApiEndpoint.post(
        "sharedAccountCustomerGroupAccess",
        "/shared-account-customer-group-access",
        {
          error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
        },
      ),
    )
    .add(
      HttpApiEndpoint.post("users", "/users", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .prefix("/papercut/sync") {}
}
