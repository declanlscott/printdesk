import { and, eq, getViewSelectedFields, isNull, ne } from "drizzle-orm";
import { bigint, check, index, snakeCase, text, unique } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { activeSharedAccountManagerAccessView } from "../shared-accounts/sql";
import { Tables } from "../tables";
import { OrderObjectsContract, OrdersContract } from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { EntityId } from "../utils";

type OrderRow<TRow> = Omit<TRow, "roomWorkflowStatusId" | "sharedAccountWorkflowStatusId"> &
  (
    | { roomWorkflowStatusId: EntityId; sharedAccountWorkflowStatusId: null }
    | { roomWorkflowStatusId: null; sharedAccountWorkflowStatusId: EntityId }
  );
export const orders = new Tables.Sync(
  "orders",
  {
    shortId: Columns.shortId(),
    customerId: Columns.entityId().notNull(),
    managerId: Columns.entityId(),
    operatorId: Columns.entityId(),
    productId: Columns.entityId().notNull(),
    sharedAccountId: Columns.entityId(), // null when charging to customer's personal account
    roomWorkflowStatusId: Columns.entityId(),
    sharedAccountWorkflowStatusId: Columns.entityId(),
    deliveryOptionId: Columns.entityId().notNull(),
    attributes: Columns.jsonb(OrdersContract.Attributes).notNull(),
    approvedAt: Columns.dateTime(),
  },
  (table) => [
    index().on(table.customerId),
    index().on(table.sharedAccountId),
    index().on(table.roomWorkflowStatusId),
    index().on(table.sharedAccountWorkflowStatusId),
    check(
      "workflow_status_id_xor",
      ne(isNull(table.roomWorkflowStatusId), isNull(table.sharedAccountWorkflowStatusId)),
    ),
  ],
);
export const ordersTable = orders.table;
export type OrdersTable = typeof orders.table;
export type Order = OrderRow<InferSelectModel<OrdersTable>>;
export const activeOrdersView = snakeCase
  .view(`active_${orders.name}`)
  .as((qb) => qb.select().from(orders.table).where(isNull(orders.table.deletedAt)));
export type ActiveOrdersView = typeof activeOrdersView;
export type ActiveOrder = OrderRow<InferSelectViewModel<ActiveOrdersView>>;
export type ActiveCustomerPlacedOrdersView = ActiveOrdersView;
export type ActiveCustomerPlacedOrder = ActiveOrder;
export const activeManagerAuthorizedSharedAccountOrdersView = snakeCase
  .view(`active_manager_authorized_shared_account_${orders.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeOrdersView),
        authorizedManagerId:
          activeSharedAccountManagerAccessView.managerId.as("authorized_manager_id"),
      })
      .from(activeOrdersView)
      .innerJoin(
        activeSharedAccountManagerAccessView,
        and(
          eq(
            activeOrdersView.sharedAccountId,
            activeSharedAccountManagerAccessView.sharedAccountId,
          ),
          eq(activeOrdersView.tenantId, activeSharedAccountManagerAccessView.tenantId),
        ),
      ),
  );
export type ActiveManagerAuthorizedSharedAccountOrdersView =
  typeof activeManagerAuthorizedSharedAccountOrdersView;
export type ActiveManagerAuthorizedSharedAccountOrder = OrderRow<
  InferSelectViewModel<ActiveManagerAuthorizedSharedAccountOrdersView>
>;

export const orderObjects = new Tables.Sync(
  "order_objects",
  {
    orderId: Columns.entityId().notNull(),
    key: text().notNull(),
    filename: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    status: Columns.union(OrderObjectsContract.Status.literals).notNull(),
  },
  (table) => [unique().on(table.orderId, table.key, table.filename, table.tenantId)],
);
export const orderObjectsTable = orderObjects.table;
export type OrderObjectsTable = typeof orderObjects.table;
export type OrderObject = InferSelectModel<OrderObjectsTable>;
export const activeOrderObjectsView = snakeCase
  .view(`active_${orderObjects.name}`)
  .as((qb) => qb.select().from(orderObjects.table).where(isNull(orderObjects.table.deletedAt)));
export type ActiveOrderObjectsView = typeof activeOrderObjectsView;
export type ActiveOrderObject = InferSelectViewModel<ActiveOrderObjectsView>;
export const activeCustomerPlacedOrderObjectsView = snakeCase
  .view(`active_customer_placed_${orderObjects.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeOrderObjectsView),
        customerId: activeOrdersView.customerId,
      })
      .from(activeOrderObjectsView)
      .innerJoin(
        activeOrdersView,
        and(
          eq(activeOrderObjectsView.orderId, activeOrdersView.id),
          eq(activeOrderObjectsView.tenantId, activeOrdersView.tenantId),
        ),
      ),
  );
export type ActiveCustomerPlacedOrderObjectsView = typeof activeCustomerPlacedOrderObjectsView;
export type ActiveCustomerPlacedOrderObject =
  InferSelectViewModel<ActiveCustomerPlacedOrderObjectsView>;
export const activeManagerAuthorizedSharedAccountOrderObjectsView = snakeCase
  .view(`active_manager_authorized_shared_account_${orderObjects.name}`)
  .as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeOrderObjectsView),
        authorizedManagerId: activeSharedAccountManagerAccessView.managerId,
      })
      .from(activeOrderObjectsView)
      .innerJoin(
        activeOrdersView,
        and(
          eq(activeOrderObjectsView.orderId, activeOrdersView.id),
          eq(activeOrderObjectsView.tenantId, activeOrdersView.tenantId),
        ),
      )
      .innerJoin(
        activeSharedAccountManagerAccessView,
        and(
          eq(
            activeOrdersView.sharedAccountId,
            activeSharedAccountManagerAccessView.sharedAccountId,
          ),
          eq(activeOrdersView.tenantId, activeSharedAccountManagerAccessView.tenantId),
        ),
      ),
  );
export type ActiveManagerAuthorizedSharedAccountOrderObjectsView =
  typeof activeManagerAuthorizedSharedAccountOrderObjectsView;
export type ActiveManagerAuthorizedSharedAccountOrderObject =
  InferSelectViewModel<ActiveManagerAuthorizedSharedAccountOrderObjectsView>;
