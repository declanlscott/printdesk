import { isNull } from "drizzle-orm";
import { index, pgView, varchar } from "drizzle-orm/pg-core";

import { datetime, id, jsonb, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  activeOrdersViewName,
  OrderAttributes,
  ordersTableName,
} from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

export const ordersTable = tenantTable(
  ordersTableName,
  {
    customerId: id("customer_id").notNull(),
    managerId: id("manager_id"),
    operatorId: id("operator_id"),
    productId: id("product_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
    attributes: jsonb("attributes", OrderAttributes).notNull(),
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
export type Order = InferFromTable<OrdersTable>;

export const activeOrdersView = pgView(activeOrdersViewName).as((qb) =>
  qb.select().from(ordersTable).where(isNull(ordersTable.deletedAt)),
);
export type ActiveOrdersView = typeof activeOrdersView;
export type ActiveOrder = InferFromView<ActiveOrdersView>;
