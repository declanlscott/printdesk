import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { BillingAccounts } from "../billing-accounts2";
import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { Database } from "../database2";
import { workflowStatusesTable } from "../rooms2/sql";
import { Sync } from "../sync2";
import { activeUsersView } from "../users2/sql";
import {
  approveOrder,
  createOrder,
  deleteOrder,
  editOrder,
  transitionOrder,
} from "./shared";
import { activeOrdersView, ordersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorization } from "../billing-accounts2/sql";
import type { Order, OrdersTable } from "./sql";

export namespace Orders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/orders/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ordersTable;
        const activeView = activeOrdersView;

        const create = Effect.fn("Orders.Repository.create")(
          (order: InferInsertModel<OrdersTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(order).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Orders.Repository.getMetadata")(
          (tenantId: Order["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Orders.Repository.getActiveMetadata",
        )((tenantId: Order["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByBillingAccountManagerId = Effect.fn(
          "Orders.Repository.getActiveMetadataByBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            tenantId: Order["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .innerJoin(
                  activeBillingAccountsView,
                  and(
                    eq(
                      activeView.billingAccountId,
                      activeBillingAccountsView.id,
                    ),
                    eq(activeView.tenantId, activeBillingAccountsView.tenantId),
                  ),
                )
                .innerJoin(
                  activeBillingAccountManagerAuthorizationsView,
                  and(
                    eq(
                      activeBillingAccountsView.id,
                      activeBillingAccountManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeBillingAccountsView.tenantId,
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(
                    eq(
                      activeBillingAccountManagerAuthorizationsView.managerId,
                      managerId,
                    ),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const getActiveMetadataByCustomerId = Effect.fn(
          "Orders.Repository.getActiveMetadataByCustomerId",
        )((customerId: Order["customerId"], tenantId: Order["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(
                and(
                  eq(activeView.customerId, customerId),
                  eq(activeView.tenantId, tenantId),
                ),
              ),
          ),
        );

        const findById = Effect.fn("Orders.Repository.findById")(
          (id: Order["id"], tenantId: Order["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIds = Effect.fn("Orders.Repository.findByIds")(
          (ids: ReadonlyArray<Order["id"]>, tenantId: Order["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const findActiveManagerIds = Effect.fn(
          "Orders.Repository.findActiveManagerIds",
        )((id: Order["id"], tenantId: Order["tenantId"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ id: activeUsersView.id })
                .from(activeView)
                .innerJoin(
                  activeBillingAccountManagerAuthorizationsView,
                  and(
                    eq(
                      activeView.billingAccountId,
                      activeBillingAccountManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeUsersView,
                  and(
                    eq(
                      activeBillingAccountManagerAuthorizationsView.managerId,
                      activeUsersView.id,
                    ),
                    eq(
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                      activeUsersView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(eq(activeView.id, id), eq(activeView.tenantId, tenantId)),
                ),
            )
            .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findStatus = Effect.fn("Orders.Repository.findStatus")(
          (id: Order["id"], tenantId: Order["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    status: getTableColumns(workflowStatusesTable),
                  })
                  .from(table)
                  .leftJoin(
                    workflowStatusesTable,
                    and(
                      eq(table.workflowStatus, workflowStatusesTable.id),
                      eq(table.tenantId, workflowStatusesTable.tenantId),
                    ),
                  )
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.map(({ status }) => status),
              ),
        );

        const updateById = Effect.fn("Orders.Repository.updateById")(
          (
            id: Order["id"],
            order: Partial<Omit<Order, "id" | "tenantId">>,
            tenantId: Order["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(order)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("Orders.Repository.deleteById")(
          (
            id: Order["id"],
            deletedAt: NonNullable<Order["deletedAt"]>,
            tenantId: Order["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteByProductId = Effect.fn(
          "Orders.Repository.deleteByProductId",
        )(
          (
            productId: Order["productId"],
            deletedAt: NonNullable<Order["deletedAt"]>,
            tenantId: Order["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(
                    and(
                      eq(table.productId, productId),
                      eq(table.tenantId, tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByBillingAccountManagerId,
          getActiveMetadataByCustomerId,
          findById,
          findByIds,
          findActiveManagerIds,
          findStatus,
          updateById,
          deleteById,
          deleteByProductId,
        } as const;
      }),
    },
  ) {}

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/orders/Policy",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isCustomer = Effect.fn("Orders.Policy.isCustomer")(
          (id: Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map((order) => order.customerId === principal.userId),
                ),
            ),
        );

        const isManager = Effect.fn("Orders.Policy.isManager")(
          (id: Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map((order) => order.managerId === principal.userId),
                ),
            ),
        );

        const isCustomerOrManager = Effect.fn(
          "Orders.Policy.isCustomerOrManager",
        )((id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findById(id, principal.tenantId)
              .pipe(
                Effect.map(
                  (order) =>
                    order.customerId === principal.userId ||
                    order.managerId === principal.userId,
                ),
              ),
          ),
        );

        const hasActiveManagerAuthorization = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findActiveManagerIds(id, principal.tenantId)
              .pipe(
                Effect.map(
                  Array.some((managerId) => managerId === principal.userId),
                ),
              ),
          );

        const canEdit = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findStatus(id, principal.tenantId)
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
          );

        const canApprove = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findStatus(id, principal.tenantId)
              .pipe(Effect.map((status) => status?.type === "Review")),
          );

        const canTransition = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findStatus(id, principal.tenantId)
              .pipe(Effect.map((status) => status?.type !== "Completed")),
          );

        const canDelete = canEdit;

        return {
          isCustomer,
          isManager,
          isCustomerOrManager,
          hasActiveManagerAuthorization,
          canEdit,
          canApprove,
          canTransition,
          canDelete,
        } as const;
      }),
    },
  ) {}

  export class SyncMutations extends Effect.Service<SyncMutations>()(
    "@printdesk/core/orders/SyncMutations",
    {
      dependencies: [Policy.Default, BillingAccounts.Policy.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const policy = yield* Policy;
        const billingAccountsPolicy = yield* BillingAccounts.Policy;

        const create = Sync.Mutation(
          createOrder,
          ({ billingAccountId }) =>
            AccessControl.some(
              AccessControl.permission("orders:create"),
              billingAccountsPolicy.hasActiveAuthorization(billingAccountId),
            ),
          (order, { tenantId }) =>
            // TODO: Verify workflow status is correct
            repository.create({ ...order, tenantId }),
        );

        const edit = Sync.Mutation(
          editOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                policy.isCustomer(id),
              ),
              policy.canEdit(id),
            ),
          ({ id, ...order }, session) =>
            repository.updateById(id, order, session.tenantId),
        );

        const approve = Sync.Mutation(
          approveOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                policy.hasActiveManagerAuthorization(id),
              ),
              policy.canApprove(id),
            ),
          ({ id, ...order }, session) =>
            // TODO: Transition to first "New" status
            repository.updateById(id, order, session.tenantId),
        );

        const transition = Sync.Mutation(
          transitionOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.permission("orders:update"),
              policy.canTransition(id),
            ),
          ({ id, ...order }, session) =>
            repository.updateById(id, order, session.tenantId),
        );

        const delete_ = Sync.Mutation(
          deleteOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.permission("orders:delete"),
              policy.canDelete(id),
            ),
          ({ id, deletedAt }, session) =>
            repository.deleteById(id, deletedAt, session.tenantId),
        );

        return { create, edit, approve, transition, delete: delete_ } as const;
      }),
    },
  ) {}
}
