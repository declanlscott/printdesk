import { and, eq, getViewSelectedFields, isNull, ne } from "drizzle-orm";
import { check, index, snakeCase } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { activeSharedAccountManagerAccessView } from "../shared-accounts/sql";
import { Tables } from "../tables";
import { OrdersContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { EntityId } from "../utils";

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

type OrderRow<TRow> = Omit<TRow, "roomWorkflowStatusId" | "sharedAccountWorkflowStatusId"> &
  (
    | {
        roomWorkflowStatusId: EntityId;
        sharedAccountWorkflowStatusId: null;
      }
    | {
        roomWorkflowStatusId: null;
        sharedAccountWorkflowStatusId: EntityId;
      }
  );
