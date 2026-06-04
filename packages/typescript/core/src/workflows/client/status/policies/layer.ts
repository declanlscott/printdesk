import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import { WorkflowStatusesPolicies } from ".";
import { AccessControl } from "../../../../access-control";
import { OrdersReadRepository } from "../../../../orders/client/read-repository";
import { Policy } from "../../../../policies";
import { WorkflowStatusesContract, SharedAccountWorkflowsContract } from "../../../contracts";
import { SharedAccountWorkflowsPolicies } from "../../shared-account/policies";
import { WorkflowStatusesReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* WorkflowStatusesReadRepository;
  const ordersRepository = yield* OrdersReadRepository;

  const sharedAccountWorkflowPolicies = yield* SharedAccountWorkflowsPolicies;

  const canEdit = Policy.make(WorkflowStatusesContract.canEdit, {
    make: ({ id }) =>
      repository.findById(id).pipe(
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
  });

  const canDelete = Policy.make(WorkflowStatusesContract.canDelete, {
    make: ({ id }) =>
      AccessControl.every(
        ordersRepository
          .findByWorkflowStatusId(id)
          .pipe(
            Effect.map(Array.isArrayEmpty),
            AccessControl.policy({ name: SharedAccountWorkflowsContract.Table.name, id }),
          ),
        repository.findById(id).pipe(
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
  });

  return { canEdit, canDelete } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesPolicies));
