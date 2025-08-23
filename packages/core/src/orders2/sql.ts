import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView, varchar } from "drizzle-orm/pg-core";

import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { datetime, id, jsonb, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { OrdersContract } from "./contract";

import type { TableContract } from "../database2/contract";

export const ordersTable = tenantTable(
  OrdersContract.tableName,
  {
    customerId: id<TableContract.EntityId>("customer_id").notNull(),
    managerId: id<TableContract.EntityId>("manager_id"),
    operatorId: id<TableContract.EntityId>("operator_id"),
    productId: id<TableContract.EntityId>("product_id").notNull(),
    billingAccountId:
      id<TableContract.EntityId>("billing_account_id").notNull(),
    attributes: jsonb("attributes", OrdersContract.Attributes).notNull(),
    workflowStatus: varchar("workflow_status", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    deliverTo: varchar("deliver_to", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    approvedAt: datetime("approved_at"),
  },
  (table) => [index().on(table.customerId), index().on(table.billingAccountId)],
);
export type OrdersTable = typeof ordersTable;
export type Order = TableContract.Infer<OrdersTable>;

export const activeOrdersView = pgView(OrdersContract.activeViewName).as((qb) =>
  qb.select().from(ordersTable).where(isNull(ordersTable.deletedAt)),
);
export type ActiveOrdersView = typeof activeOrdersView;
export type ActiveOrder = TableContract.InferFromView<ActiveOrdersView>;

export const activeManagedBillingAccountOrdersView = pgView(
  OrdersContract.activeManagedBillingAccountViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeOrdersView),
      authorizedManagerId:
        activeBillingAccountManagerAuthorizationsView.managerId,
    })
    .from(activeOrdersView)
    .innerJoin(
      activeBillingAccountsView,
      and(
        eq(activeOrdersView.billingAccountId, activeBillingAccountsView.id),
        eq(activeOrdersView.tenantId, activeBillingAccountsView.tenantId),
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
    ),
);
export type ActiveManagedBillingAccountOrdersView =
  typeof activeManagedBillingAccountOrdersView;
export type ActiveManagedBillingAccountOrder =
  TableContract.InferFromView<ActiveManagedBillingAccountOrdersView>;
