import { Array, Effect, Equal, Option } from "effect";

import { AccessControl } from "../access-control2";
import { BillingAccounts } from "../billing-accounts2/client";
import { BillingAccountManagerAuthorizationsContract } from "../billing-accounts2/contracts";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import { WorkflowsContract } from "../rooms2/contracts";
import { Users } from "../users2/client";
import { OrdersContract } from "./contract";

export namespace Orders {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/orders/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(OrdersContract.table);
        const { get, scan } = yield* Replicache.ReadTransactionManager;

        const findManagerIds = (
          id: typeof OrdersContract.table.Schema.Type.id,
        ) =>
          get(OrdersContract.table, id).pipe(
            Effect.flatMap((order) =>
              scan(BillingAccountManagerAuthorizationsContract.table).pipe(
                Effect.map(
                  Array.filterMap((authorization) =>
                    Equal.equals(
                      authorization.billingAccountId,
                      order.billingAccountId,
                    )
                      ? Option.some(authorization.managerId)
                      : Option.none(),
                  ),
                ),
              ),
            ),
          );

        const findStatus = (id: typeof OrdersContract.table.Schema.Type.id) =>
          get(OrdersContract.table, id).pipe(
            Effect.flatMap((order) =>
              get(WorkflowsContract.table, order.workflowStatus).pipe(
                Effect.catchTag("NoSuchElementException", () =>
                  Effect.succeed(null),
                ),
              ),
            ),
          );

        return { ...base, findManagerIds, findStatus } as const;
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/orders/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(OrdersContract.table, repository),
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

        const isCustomer = DataAccessContract.makePolicy(
          OrdersContract.isCustomer,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id).pipe(
                  Effect.map(({ customerId }) => customerId),
                  Effect.map(Equal.equals(principal.userId)),
                ),
              ),
          }),
        );

        const isManager = DataAccessContract.makePolicy(
          OrdersContract.isManager,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id).pipe(
                  Effect.map(({ managerId }) => managerId),
                  Effect.map(Equal.equals(principal.userId)),
                ),
              ),
          }),
        );

        const isCustomerOrManager = DataAccessContract.makePolicy(
          OrdersContract.isCustomerOrManager,
          Effect.succeed({
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
          }),
        );

        const hasActiveManagerAuthorization = DataAccessContract.makePolicy(
          OrdersContract.hasActiveManagerAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findManagerIds(id)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          }),
        );

        const canEdit = DataAccessContract.makePolicy(
          OrdersContract.canEdit,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findStatus(id)
                  .pipe(
                    Effect.map((status) =>
                      status !== null
                        ? !(
                            status.type === "InProgress" ||
                            status.type === "Completed"
                          )
                        : false,
                    ),
                  ),
              ),
          }),
        );

        const canApprove = DataAccessContract.makePolicy(
          OrdersContract.canApprove,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findStatus(id)
                  .pipe(Effect.map((status) => status?.type === "Review")),
              ),
          }),
        );

        const canTransition = DataAccessContract.makePolicy(
          OrdersContract.canTransition,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy(() =>
                repository
                  .findStatus(id)
                  .pipe(Effect.map((status) => status?.type !== "Completed")),
              ),
          }),
        );

        const canDelete = DataAccessContract.makePolicy(
          OrdersContract.canDelete,
          canEdit,
        );

        return {
          isCustomer,
          isManager,
          isCustomerOrManager,
          hasActiveManagerAuthorization,
          canEdit,
          canDelete,
          canApprove,
          canTransition,
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
        BillingAccounts.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const isSelf = yield* Users.Policies.isSelf;

        const hasActiveCustomerAuthorization =
          yield* BillingAccounts.Policies.hasActiveCustomerAuthorization;
        const hasActiveManagerAuthorization =
          yield* BillingAccounts.Policies.hasActiveManagerAuthorization;

        const isCustomerOrManager = yield* Policies.isCustomerOrManager;
        const canEdit = yield* Policies.canEdit;
        const hasOrderActiveManagerAuthorization =
          yield* Policies.hasActiveManagerAuthorization;
        const canApprove = yield* Policies.canApprove;
        const canTransition = yield* Policies.canTransition;
        const canDelete = yield* Policies.canDelete;

        const create = DataAccessContract.makeMutation(
          OrdersContract.create,
          Effect.succeed({
            makePolicy: ({ billingAccountId, customerId }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:create"),
                  isSelf.make({ id: customerId }),
                  hasActiveManagerAuthorization.make({ id: billingAccountId }),
                ),
                hasActiveCustomerAuthorization.make({
                  id: billingAccountId,
                  customerId,
                }),
              ),
            mutator: (order, { tenantId }) =>
              repository.create(
                OrdersContract.table.Schema.make({ ...order, tenantId }),
              ),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          OrdersContract.edit,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:update"),
                  isCustomerOrManager.make({ id }),
                ),
                canEdit.make({ id }),
              ),
            mutator: (order) => repository.updateById(order.id, order),
          }),
        );

        const approve = DataAccessContract.makeMutation(
          OrdersContract.approve,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:update"),
                  hasOrderActiveManagerAuthorization.make({ id }),
                ),
                canApprove.make({ id }),
              ),
            mutator: ({ id, ...order }) => repository.updateById(id, order),
          }),
        );

        const transition = DataAccessContract.makeMutation(
          OrdersContract.transition,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:update"),
                canTransition.make({ id }),
              ),
            mutator: ({ id, ...order }) => repository.updateById(id, order),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          OrdersContract.delete_,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:delete"),
                canDelete.make({ id }),
              ),
            mutator: ({ id }) => repository.deleteById(id),
          }),
        );

        return { create, edit, approve, transition, delete: delete_ } as const;
      }),
    },
  ) {}
}
