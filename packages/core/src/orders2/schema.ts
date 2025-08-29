import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";

import { BillingAccountManagerAuthorizationsSchema } from "../billing-accounts2/schemas";
import { datetime, id, jsonb, tenantTable } from "../database2/constructors";
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
      workflowStatusId:
        id<TableContract.EntityId>("workflow_status_id").notNull(),
      deliveryOptionId:
        id<TableContract.EntityId>("delivery_option_id").notNull(),
      attributes: jsonb("attributes", OrdersContract.Attributes).notNull(),
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
        BillingAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.billingAccountId,
            BillingAccountManagerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            activeView.tenantId,
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
