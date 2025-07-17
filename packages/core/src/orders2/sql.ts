import { index, timestamp, varchar } from "drizzle-orm/pg-core";

import {
  customJsonb,
  id,
  SyncTable,
  tenantTable,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import { OrderAttributes, ordersTableName } from "./shared";

import type { InferFromTable } from "../database2/constructors";

export const ordersTable = SyncTable(
  tenantTable(
    ordersTableName,
    {
      customerId: id("customer_id").notNull(),
      managerId: id("manager_id"),
      operatorId: id("operator_id"),
      productId: id("product_id").notNull(),
      billingAccountId: id("billing_account_id").notNull(),
      attributes: customJsonb("attributes", OrderAttributes).notNull(),
      workflowStatus: varchar("workflow_status", {
        length: Constants.VARCHAR_LENGTH,
      }).notNull(),
      deliverTo: varchar("deliver_to", {
        length: Constants.VARCHAR_LENGTH,
      }).notNull(),
      approvedAt: timestamp("approved_at"),
    },
    (table) => [
      index().on(table.customerId),
      index().on(table.billingAccountId),
    ],
  ),
  ["create", "read", "update", "delete"],
);

export type OrdersTable = (typeof ordersTable)["table"];

export type Order = InferFromTable<OrdersTable>;
