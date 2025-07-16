import { index, timestamp, varchar } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  customJsonb,
  id,
  SyncTable,
  tenantTable,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import { ordersTableName } from "./shared";

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
      // TODO: Attributes schema
      attributes: customJsonb("attributes", Schema.Struct({})).notNull(),
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
