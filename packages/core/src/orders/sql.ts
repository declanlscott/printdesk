import { index, timestamp, varchar } from "drizzle-orm/pg-core";

import { customJsonb, id } from "../database/columns";
import { tenantTable } from "../database/tables";
import { Constants } from "../utils/constants";
import { orderAttributesSchema, ordersTableName } from "./shared";

import type { InferFromTable } from "../database/tables";

export const ordersTable = tenantTable(
  ordersTableName,
  {
    customerId: id("customer_id").notNull(),
    managerId: id("manager_id"),
    operatorId: id("operator_id"),
    productId: id("product_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
    attributes: customJsonb("attributes", orderAttributesSchema).notNull(),
    workflowStatus: varchar("workflow_status", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    deliverTo: varchar("deliver_to", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    approvedAt: timestamp("approved_at"),
  },
  (table) => [index().on(table.customerId), index().on(table.billingAccountId)],
);

export type OrdersTable = typeof ordersTable;

export type Order = InferFromTable<OrdersTable>;
