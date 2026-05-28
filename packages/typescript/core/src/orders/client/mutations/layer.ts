import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import { OrdersMutations } from ".";
import { AccessControl } from "../../../access-control";
import { MutationsContract } from "../../../mutations/contract";
import { SharedAccountsPolicies } from "../../../shared-accounts/client/policies";
import { UsersPolicies } from "../../../users/client/policies";
import { OrdersContract } from "../../contract";
import { OrdersPolicies } from "../policies";
import { OrdersWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* OrdersWriteRepository;

  const userPolicies = yield* UsersPolicies;
  const sharedAccountPolicies = yield* SharedAccountsPolicies;
  const policies = yield* OrdersPolicies;

  const create = MutationsContract.makeMutation(OrdersContract.create, {
    makePolicy: (order) =>
      AccessControl.some(
        AccessControl.userPermissionPolicy("orders:create"),
        Match.value(order).pipe(
          Match.when({ sharedAccountId: Match.string }, (order) =>
            AccessControl.every(
              AccessControl.some(
                userPolicies.isSelf.make({ id: order.customerId }),
                sharedAccountPolicies.isManagerAuthorized.make({
                  id: order.sharedAccountId,
                  managerId: Option.none(),
                }),
              ),
              sharedAccountPolicies.isCustomerAuthorized.make({
                id: order.sharedAccountId,
                customerId: Option.some(order.customerId),
              }),
            ),
          ),
          Match.orElse((order) => userPolicies.isSelf.make({ id: order.customerId })),
        ),
      ),
    mutator: (order, { tenantId }) =>
      OrdersContract.Table.Dto.makeEffect({ ...order, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  const edit = MutationsContract.makeMutation(OrdersContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("orders:update"),
          AccessControl.some(
            policies.isCustomerOrManager.make({ id, userId: Option.none() }),
            policies.isManagerAuthorized.make({ id, managerId: Option.none() }),
          ),
        ),
        policies.canEdit.make({ id }),
      ),
    mutator: (order) => repository.updateById(order.id, () => Effect.succeed(order)),
  });

  const approve = MutationsContract.makeMutation(OrdersContract.approve, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("orders:update"),
          policies.isManagerAuthorized.make({ id, managerId: Option.none() }),
        ),
        policies.canApprove.make({ id }),
      ),
    mutator: ({ id, ...order }) => repository.updateById(id, () => Effect.succeed(order)),
  });

  const transitionRoomWorkflowStatus = MutationsContract.makeMutation(
    OrdersContract.transitionRoomWorkflowStatus,
    {
      makePolicy: ({ id }) =>
        AccessControl.every(
          AccessControl.userPermissionPolicy("orders:update"),
          policies.canTransition.make({ id }),
        ),
      mutator: ({ id, ...order }) =>
        repository.updateById(id, () =>
          Effect.succeed({ ...order, sharedAccountWorkflowStatusId: null }),
        ),
    },
  );

  const transitionSharedAccountWorkflowStatus = MutationsContract.makeMutation(
    OrdersContract.transitionSharedAccountWorkflowStatus,
    {
      makePolicy: ({ id }) =>
        AccessControl.every(
          AccessControl.some(
            AccessControl.userPermissionPolicy("orders:update"),
            policies.isManagerAuthorized.make({ id, managerId: Option.none() }),
          ),
          policies.canTransition.make({ id }),
        ),
      mutator: ({ id, ...order }) =>
        repository.updateById(id, () => Effect.succeed({ ...order, roomWorkflowStatusId: null })),
    },
  );

  const delete_ = MutationsContract.makeMutation(OrdersContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.some(
          AccessControl.userPermissionPolicy("orders:delete"),
          AccessControl.some(
            policies.isCustomerOrManager.make({ id, userId: Option.none() }),
            policies.isManagerAuthorized.make({ id, managerId: Option.none() }),
          ),
        ),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("orders:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = MutationsContract.makeMutation(OrdersContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("orders:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) => repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
  });

  return {
    create,
    edit,
    approve,
    transitionRoomWorkflowStatus,
    transitionSharedAccountWorkflowStatus,
    delete: delete_,
    restore,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(OrdersMutations));
