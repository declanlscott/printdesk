import { Array, Effect, Equal, Match, Option, Predicate, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import { SharedAccounts } from "../shared-accounts2/client";
import { Users } from "../users2/client";
import { OrdersContract } from "./contract";

import type { ColumnsContract } from "../columns2/contract";

export namespace Orders {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/orders/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Effect.gen(function* () {
        const table = yield* Models.SyncTables.orders;
        const base = yield* Replicache.makeReadRepository(table);

        const workflowStatusesTable = yield* Models.SyncTables.workflowStatuses;
        const sharedAccountManagerAuthorizationsTable =
          yield* Models.SyncTables.sharedAccountManagerAuthorizations;

        const { get, scan } = yield* Replicache.ReadTransactionManager;

        const findByIdWithWorkflowStatus = (
          id: OrdersContract.DataTransferObject["id"],
        ) =>
          Effect.gen(function* () {
            const order = yield* get(table, id);

            const workflowStatus = yield* get(
              workflowStatusesTable,
              order.roomWorkflowStatusId ?? order.sharedAccountWorkflowStatusId,
            );

            return { order, workflowStatus };
          });

        const findByWorkflowStatusId = (
          workflowStatusId: ColumnsContract.EntityId,
        ) =>
          base.findAll.pipe(
            Effect.map(
              Array.filterMap((order) =>
                Equal.equals(order.roomWorkflowStatusId, workflowStatusId) ||
                Equal.equals(
                  order.sharedAccountWorkflowStatusId,
                  workflowStatusId,
                )
                  ? Option.some(order)
                  : Option.none(),
              ),
            ),
          );

        const findActiveManagerIds = (
          id: OrdersContract.DataTransferObject["id"],
        ) =>
          get(table, id).pipe(
            Effect.flatMap((order) =>
              scan(sharedAccountManagerAuthorizationsTable).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.sharedAccountId,
                      order.sharedAccountId,
                    ) && Equal.equals(authorization.deletedAt, null)
                      ? Option.some(authorization.managerId)
                      : Option.none(),
                  ),
                ),
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
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([Models.SyncTables.orders, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
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

        const isCustomer = DataAccessContract.makePolicy(
          OrdersContract.isCustomer,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("customerId")),
                    Effect.map(Equal.equals(principal.userId)),
                  ),
              ),
          },
        );

        const isManager = DataAccessContract.makePolicy(
          OrdersContract.isManager,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("managerId")),
                    Effect.map(Equal.equals(principal.userId)),
                  ),
              ),
          },
        );

        const isCustomerOrManager = DataAccessContract.makePolicy(
          OrdersContract.isCustomerOrManager,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(
                      (order) =>
                        Equal.equals(order.customerId, principal.userId) ||
                        Equal.equals(order.managerId, principal.userId),
                    ),
                  ),
              ),
          },
        );

        const isManagerAuthorized = DataAccessContract.makePolicy(
          OrdersContract.isManagerAuthorized,
          {
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveManagerIds(id)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          },
        );

        const canEdit = DataAccessContract.makePolicy(OrdersContract.canEdit, {
          make: ({ id }) =>
            AccessControl.policy(() =>
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
              ),
            ),
        });

        const canApprove = DataAccessContract.makePolicy(
          OrdersContract.canApprove,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
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
                ),
              ),
          },
        );

        const canTransition = DataAccessContract.makePolicy(
          OrdersContract.canTransition,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
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
                ),
              ),
          },
        );

        const canDelete = DataAccessContract.makePolicy(
          OrdersContract.canDelete,
          { make: canEdit.make },
        );

        const canRestore = DataAccessContract.makePolicy(
          OrdersContract.canRestore,
          {
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findById(id)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
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

        const create = DataAccessContract.makeMutation(OrdersContract.create, {
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
                      }),
                    ),
                    sharedAccountPolicies.isCustomerAuthorized.make({
                      id: order.sharedAccountId,
                      customerId: order.customerId,
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
              Match.orElse((order) =>
                OrdersContract.SharedAccountWorkflowStatusDto.make({
                  ...order,
                  tenantId,
                }),
              ),
              repository.create,
            ),
        });

        const edit = DataAccessContract.makeMutation(OrdersContract.edit, {
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

        const approve = DataAccessContract.makeMutation(
          OrdersContract.approve,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:update"),
                  policies.isManagerAuthorized.make({ id }),
                ),
                policies.canApprove.make({ id }),
              ),
            mutator: ({ id, ...order }) =>
              repository.updateById(id, () => order),
          },
        );

        const transitionRoomWorkflowStatus = DataAccessContract.makeMutation(
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
          DataAccessContract.makeMutation(
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

        const delete_ = DataAccessContract.makeMutation(
          OrdersContract.delete_,
          {
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
                  AccessControl.enforce(
                    AccessControl.permission("orders:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        const restore = DataAccessContract.makeMutation(
          OrdersContract.restore,
          {
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:delete"),
                policies.canRestore.make({ id }),
              ),
            mutator: ({ id }) =>
              repository.updateById(id, () => ({ deletedAt: null })),
          },
        );

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
