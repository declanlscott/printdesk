import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView, varchar } from "drizzle-orm/pg-core";

import {
  BillingAccountManagerAuthorizationsSchema,
  BillingAccountsSchema,
} from "../billing-accounts2/schemas";
import { datetime, id, jsonb, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { OrdersContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace OrdersSchema {
  export const table = tenantTable(
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
    (table) => [
      index().on(table.customerId),
      index().on(table.billingAccountId),
    ],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(OrdersContract.activeViewName).as((qb) =>
    qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeManagedBillingAccountView = pgView(
    OrdersContract.activeManagedBillingAccountViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          BillingAccountManagerAuthorizationsSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountsSchema.activeView,
        and(
          eq(activeView.billingAccountId, BillingAccountsSchema.activeView.id),
          eq(activeView.tenantId, BillingAccountsSchema.activeView.tenantId),
        ),
      )
      .innerJoin(
        BillingAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            BillingAccountsSchema.activeView.id,
            BillingAccountManagerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            BillingAccountsSchema.activeView.tenantId,
            BillingAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagedBillingAccountView =
    typeof activeManagedBillingAccountView;
  export type ActiveManagedBillingAccount =
    InferSelectViewModel<ActiveManagedBillingAccountView>;
}
