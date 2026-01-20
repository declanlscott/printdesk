import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache/client";
import { SharedAccounts } from "../shared-accounts/client";
import { Users } from "../users/client";
import { WorkflowStatuses } from "../workflows/client";
import { OrdersContract } from "./contract";

import type { ColumnsContract } from "../columns/contract";

export namespace Orders {
  const Table = Models.syncTables[OrdersContract.Table.name];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/orders/client/ReadRepository",
    {
      dependencies: [
        Replicache.ReadTransactionManager.Default,
        WorkflowStatuses.ReadRepository.Default,
        SharedAccounts.ManagerAccessReadRepository.Default,
      ],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(Table);

        const workflowStatusesRepository =
          yield* WorkflowStatuses.ReadRepository;
        const sharedAccountManagerAccessRepository =
          yield* SharedAccounts.ManagerAccessReadRepository;

        const findByIdWithWorkflowStatus = (
          id: (typeof OrdersContract.Table.DataTransferObject.Type)["id"],
        ) =>
          Effect.gen(function* () {
            const order = yield* base.findById(id);

            const workflowStatus = yield* workflowStatusesRepository.findById(
              order.roomWorkflowStatusId ?? order.sharedAccountWorkflowStatusId,
            );

            return { order, workflowStatus };
          });

        const findByWorkflowStatusId = (
          workflowStatusId: ColumnsContract.EntityId,
        ) =>
          base.findWhere((order) =>
            order.roomWorkflowStatusId === workflowStatusId ||
            order.sharedAccountWorkflowStatusId === workflowStatusId
              ? Option.some(order)
              : Option.none(),
          );

        const findActiveManagerIds = (
          id: (typeof OrdersContract.Table.DataTransferObject.Type)["id"],
        ) =>
          base
            .findById(id)
            .pipe(
              Effect.flatMap((order) =>
                sharedAccountManagerAccessRepository.findWhere((access) =>
                  access.sharedAccountId === order.sharedAccountId &&
                  access.deletedAt === null
                    ? Option.some(access.managerId)
                    : Option.none(),
                ),
              ),
            );

        return {
          ...base,
          findByIdWithWorkflowStatus,
          findByWorkflowStatusId,
          findActiveManagerIds,
        } as const;
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/orders/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(Table, repository),
        ),
      ),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/orders/client/Policies",
    {
      accessors: true,
      dependencies: [ReadRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* ReadRepository;

        const isCustomer = PoliciesContract.makePolicy(
          OrdersContract.isCustomer,
          {
            make: ({ id }) =>
              AccessControl.userPolicy(
                {
                  name: OrdersContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findById(id)
                    .pipe(
                      Effect.map(Struct.get("customerId")),
                      Effect.map(Equal.equals(user.id)),
                    ),
              ),
          },
        );

        const isManager = PoliciesContract.makePolicy(
          OrdersContract.isManager,
          {
            make: ({ id }) =>
              AccessControl.userPolicy(
                {
                  name: OrdersContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findById(id)
                    .pipe(
                      Effect.map(Struct.get("managerId")),
                      Effect.map(Equal.equals(user.id)),
                    ),
              ),
          },
        );

        const isCustomerOrManager = PoliciesContract.makePolicy(
          OrdersContract.isCustomerOrManager,
          {
            make: ({ id }) =>
              AccessControl.userPolicy(
                {
                  name: OrdersContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findById(id)
                    .pipe(
                      Effect.map(
                        (order) =>
                          order.customerId === user.id ||
                          order.managerId === user.id,
                      ),
                    ),
              ),
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          OrdersContract.isManagerAuthorized,
          {
            make: ({ id }) =>
              AccessControl.userPolicy(
                {
                  name: OrdersContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findActiveManagerIds(id)
                    .pipe(Effect.map(Array.some(Equal.equals(user.id)))),
              ),
          },
        );

        const canEdit = PoliciesContract.makePolicy(OrdersContract.canEdit, {
          make: ({ id }) =>
            repository.findByIdWithWorkflowStatus(id).pipe(
              Effect.map(({ order, workflowStatus }) =>
                Match.value(order).pipe(
                  Match.when({ deletedAt: Match.null }, (o) =>
                    Match.value(o).pipe(
                      Match.when(
                        { sharedAccountWorkflowStatusId: Match.null },
                        () =>
                          !order.approvedAt &&
                          !(
                            workflowStatus.type === "InProgress" ||
                            workflowStatus.type === "Completed"
                          ),
                      ),
                      Match.orElse(() => true),
                    ),
                  ),
                  Match.orElse(() => false),
                ),
              ),
              AccessControl.policy({
                name: OrdersContract.Table.name,
                id,
              }),
            ),
        });

        const canApprove = PoliciesContract.makePolicy(
          OrdersContract.canApprove,
          {
            make: ({ id }) =>
              repository.findByIdWithWorkflowStatus(id).pipe(
                Effect.map(({ order }) =>
                  Match.value(order).pipe(
                    Match.when(
                      { deletedAt: Match.null },
                      (o) => o.sharedAccountWorkflowStatusId !== null,
                    ),
                    Match.orElse(() => false),
                  ),
                ),
                AccessControl.policy({
                  name: OrdersContract.Table.name,
                  id,
                }),
              ),
          },
        );

        const canTransition = PoliciesContract.makePolicy(
          OrdersContract.canTransition,
          {
            make: ({ id }) =>
              repository.findByIdWithWorkflowStatus(id).pipe(
                Effect.map(({ order, workflowStatus }) =>
                  Match.value(order).pipe(
                    Match.when(
                      { deletedAt: Match.null },
                      () => workflowStatus.type !== "Completed",
                    ),
                    Match.orElse(() => false),
                  ),
                ),
                AccessControl.policy({
                  name: OrdersContract.Table.name,
                  id,
                }),
              ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          OrdersContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = PoliciesContract.makePolicy(
          OrdersContract.canRestore,
          {
            make: ({ id }) =>
              repository.findById(id).pipe(
                Effect.map(Struct.get("deletedAt")),
                Effect.map(Predicate.isNotNull),
                AccessControl.policy({
                  name: OrdersContract.Table.name,
                  id,
                }),
              ),
          },
        );

        return {
          isCustomer,
          isManager,
          isCustomerOrManager,
          isManagerAuthorized,
          canEdit,
          canApprove,
          canTransition,
          canDelete,
          canRestore,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/orders/client/Mutations",
    {
      accessors: true,
      dependencies: [
        WriteRepository.Default,
        Users.Policies.Default,
        SharedAccounts.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const userPolicies = yield* Users.Policies;
        const sharedAccountPolicies = yield* SharedAccounts.Policies;
        const policies = yield* Policies;

        const create = MutationsContract.makeMutation(OrdersContract.create, {
          makePolicy: (order) =>
            AccessControl.some(
              AccessControl.permission("orders:create"),
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
                Match.orElse((order) =>
                  userPolicies.isSelf.make({ id: order.customerId }),
                ),
              ),
            ),
          mutator: (order, { tenantId }) =>
            // TODO: Verify workflow status is correct
            Match.value(order).pipe(
              Match.when(
                { sharedAccountWorkflowStatusId: Match.null },
                (order) =>
                  OrdersContract.RoomWorkflowStatusDto.make({
                    ...order,
                    tenantId,
                  }),
              ),
              Match.orElse(
                (order) =>
                  new OrdersContract.SharedAccountWorkflowStatusDto({
                    ...order,
                    tenantId,
                  }),
              ),
              repository.create,
            ),
        });

        const edit = MutationsContract.makeMutation(OrdersContract.edit, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                AccessControl.some(
                  policies.isCustomerOrManager.make({ id }),
                  policies.isManagerAuthorized.make({ id }),
                ),
              ),
              policies.canEdit.make({ id }),
            ),
          mutator: (order) => repository.updateById(order.id, () => order),
        });

        const approve = MutationsContract.makeMutation(OrdersContract.approve, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                policies.isManagerAuthorized.make({ id }),
              ),
              policies.canApprove.make({ id }),
            ),
          mutator: ({ id, ...order }) => repository.updateById(id, () => order),
        });

        const transitionRoomWorkflowStatus = MutationsContract.makeMutation(
          OrdersContract.transitionRoomWorkflowStatus,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:update"),
                policies.canTransition.make({ id }),
              ),
            mutator: ({ id, ...order }) =>
              repository.updateById(id, () => ({
                ...order,
                sharedAccountWorkflowStatusId: null,
              })),
          },
        );

        const transitionSharedAccountWorkflowStatus =
          MutationsContract.makeMutation(
            OrdersContract.transitionSharedAccountWorkflowStatus,
            {
              makePolicy: ({ id }) =>
                AccessControl.every(
                  AccessControl.some(
                    AccessControl.permission("orders:update"),
                    policies.isManagerAuthorized.make({ id }),
                  ),
                  policies.canTransition.make({ id }),
                ),
              mutator: ({ id, ...order }) =>
                repository.updateById(id, () => ({
                  ...order,
                  roomWorkflowStatusId: null,
                })),
            },
          );

        const delete_ = MutationsContract.makeMutation(OrdersContract.delete_, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:delete"),
                AccessControl.some(
                  policies.isCustomerOrManager.make({ id }),
                  policies.isManagerAuthorized.make({ id }),
                ),
              ),
              policies.canDelete.make({ id }),
            ),
          mutator: ({ id, deletedAt }) =>
            repository
              .updateById(id, () => ({ deletedAt }))
              .pipe(
                AccessControl.enforce(AccessControl.permission("orders:read")),
                Effect.catchTag("AccessDeniedError", () =>
                  repository.deleteById(id),
                ),
              ),
        });

        const restore = MutationsContract.makeMutation(OrdersContract.restore, {
          makePolicy: ({ id }) =>
            AccessControl.every(
              AccessControl.permission("orders:delete"),
              policies.canRestore.make({ id }),
            ),
          mutator: ({ id }) =>
            repository.updateById(id, () => ({ deletedAt: null })),
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
      }),
    },
  ) {}
}
