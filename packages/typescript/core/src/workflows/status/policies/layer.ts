import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Struct from "effect/Struct";

import { WorkflowStatusesPolicies } from ".";
import { AccessControl } from "../../../access-control";
import { Actor } from "../../../actors";
import { OrdersRepository } from "../../../orders/repository";
import { Policy } from "../../../policies";
import { WorkflowStatusesContract } from "../../contracts";
import { SharedAccountWorkflowsPolicies } from "../../shared-account/policies";
import { WorkflowStatusesRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* WorkflowStatusesRepository;
  const ordersRepository = yield* OrdersRepository;

  const sharedAccountWorkflowPolicies = yield* SharedAccountWorkflowsPolicies;

  const canEdit = Policy.make(WorkflowStatusesContract.canEdit, {
    make: Effect.fn("WorkflowStatuses.Policies.canEdit.make")(({ id }) =>
      Actor.pipe(
        Effect.flatMap(Struct.get("assertUser")),
        Effect.flatMap(({ tenantId }) =>
          repository.findById(id, tenantId).pipe(
            Effect.flatMap((workflowStatus) =>
              Match.value(workflowStatus).pipe(
                Match.when({ roomWorkflowId: Match.null }, (s) =>
                  sharedAccountWorkflowPolicies.isManagerAuthorized.make({
                    id: s.sharedAccountWorkflowId,
                    managerId: Option.none(),
                  }),
                ),
                Match.orElse(() => AccessControl.userPermissionPolicy("rooms:update")),
              ),
            ),
          ),
        ),
      ),
    ),
  });

  const canDelete = Policy.make(WorkflowStatusesContract.canDelete, {
    make: Effect.fn("WorkflowStatuses.Policies.canDelete.make")(({ id }) =>
      AccessControl.every(
        AccessControl.userPolicy(
          ({ tenantId }) =>
            ordersRepository
              .findByWorkflowStatusId(id, tenantId)
              .pipe(Effect.map(Array.isArrayEmpty)),
          { name: WorkflowStatusesContract.Table.name, id },
        ),
        canEdit.make({ id }),
      ),
    ),
  });

  return { canEdit, canDelete } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesPolicies));
