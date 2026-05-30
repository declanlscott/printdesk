import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountWorkflowsSync } from ".";
import { AccessControl } from "../../../access-control";
import { Sync } from "../../../sync";
import { sharedAccountWorkflows } from "../../sql";
import { SharedAccountWorkflowsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountWorkflowsRepository;

  const streamer = new Sync.EntityStreamerBuilder(sharedAccountWorkflows.name)
    .source(AccessControl.userPermissionPolicy("shared_account_workflows:read"), {
      findCreates: repository.findCreates,
      findUpdates: repository.findUpdates,
      findDeletes: repository.findDeletes,
      fastForward: repository.findFastForward,
    })
    .source(AccessControl.userPermissionPolicy("active_shared_account_workflows:read"), {
      findCreates: repository.findActiveCreates,
      findUpdates: repository.findActiveUpdates,
      findDeletes: repository.findActiveDeletes,
      fastForward: repository.findActiveFastForward,
    })
    .source(
      AccessControl.userPermissionPolicy(
        "active_customer_authorized_shared_account_workflows:read",
      ),
      {
        findCreates: repository.findActiveCustomerAuthorizedCreates,
        findUpdates: repository.findActiveCustomerAuthorizedUpdates,
        findDeletes: repository.findActiveCustomerAuthorizedDeletes,
        fastForward: repository.findActiveCustomerAuthorizedFastForward,
      },
    )
    .source(
      AccessControl.userPermissionPolicy("active_manager_authorized_shared_account_workflows:read"),
      {
        findCreates: repository.findActiveManagerAuthorizedCreates,
        findUpdates: repository.findActiveManagerAuthorizedUpdates,
        findDeletes: repository.findActiveManagerAuthorizedDeletes,
        fastForward: repository.findActiveManagerAuthorizedFastForward,
      },
    )
    .build();

  return { streamer } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountWorkflowsSync));
