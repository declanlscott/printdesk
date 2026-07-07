import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { PapercutMfContract } from "../papercut-mf/contract";

export namespace PapercutApi {
  export class MfGroup extends HttpApiGroup.make("PapercutMf")
    .add(
      HttpApiEndpoint.get("health", "/health", {
        success: PapercutMfContract.HealthSuccess,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .add(
      HttpApiEndpoint.get("taskStatus", "/task-status", {
        success: PapercutMfContract.TaskStatusSuccess,
        error: [ActorsContract.ForbiddenActorError, AccessControl.AccessDeniedError],
      }),
    )
    .prefix("/papercut/mf") {}

  export class MfSyncGroup extends HttpApiGroup.make("PapercutMfSync")
    .add(
      HttpApiEndpoint.post("source", "/source", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutMfContract.IncompleteTaskStatusError,
          PapercutMfContract.UserAndGroupSyncFailure,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("all", "/", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutMfContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("customerGroups", "/customer-groups", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutMfContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("customerGroupMemberships", "/customer-group-memberships", {
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          PapercutMfContract.IncompleteTaskStatusError,
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
          PapercutMfContract.IncompleteTaskStatusError,
        ],
      }),
    )
    .prefix("/papercut/mf/sync") {}
}
