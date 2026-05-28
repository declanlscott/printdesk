import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { WorkflowStatusesSync } from ".";
import { AccessControl } from "../../../access-control";
import { SyncContract } from "../../../sync/contract";
import { workflowStatuses } from "../../sql";
import { WorkflowStatusesRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* WorkflowStatusesRepository;

  const streamer = new SyncContract.EntityStreamerBuilder(workflowStatuses.name)
    .source(AccessControl.userPermissionPolicy("workflow_statuses:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_workflow_statuses:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy(
        "active_customer_authorized_shared_account_workflow_statuses:read",
      ),
      {
        findCreates: repository.findActiveCustomerAuthorizedSharedAccountCreates,
        findUpdates: repository.findActiveCustomerAuthorizedSharedAccountUpdates,
        findDeletes: repository.findActiveCustomerAuthorizedSharedAccountDeletes,
        fastForward: repository.findActiveCustomerAuthorizedSharedAccountFastForward,
      },
    )
    .source(
      AccessControl.userPermissionPolicy(
        "active_manager_authorized_shared_account_workflow_statuses:read",
      ),
      {
        findCreates: repository.findActiveManagerAuthorizedSharedAccountCreates,
        findUpdates: repository.findActiveManagerAuthorizedSharedAccountUpdates,
        findDeletes: repository.findActiveManagerAuthorizedSharedAccountDeletes,
        fastForward: repository.findActiveManagerAuthorizedSharedAccountFastForward,
      },
    )
    .source(AccessControl.userPermissionPolicy("active_published_room_workflow_statuses:read"), {
      findCreates: repository.findActivePublishedRoomCreates,
      findUpdates: repository.findActivePublishedRoomUpdates,
      findDeletes: repository.findActivePublishedRoomDeletes,
      fastForward: repository.findActivePublishedRoomFastForward,
    })
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesSync));
