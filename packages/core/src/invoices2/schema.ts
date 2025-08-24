import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import { BillingAccountManagerAuthorizationsSchema } from "../billing-accounts2/schemas";
import {
  datetime,
  id,
  jsonb,
  pgEnum,
  tenantTable,
} from "../database2/constructors";
import { OrdersSchema } from "../orders2/schema";
import { InvoicesContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace InvoicesSchema {
  export const table = tenantTable(
    InvoicesContract.tableName,
    {
      lineItems: jsonb(
        "line_items",
        Schema.Array(InvoicesContract.LineItem),
      ).notNull(),
      status: pgEnum("status", InvoicesContract.statuses)
        .default("processing")
        .notNull(),
      chargedAt: datetime("charged_at"),
      orderId: id<TableContract.EntityId>("order_id").notNull(),
    },
    (table) => [index().on(table.orderId)],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(InvoicesContract.activeViewName).as((qb) =>
    qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeManagedBillingAccountOrderView = pgView(
    InvoicesContract.activeManagedBillingAccountOrderViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          BillingAccountManagerAuthorizationsSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        OrdersSchema.activeView,
        and(
          eq(activeView.orderId, OrdersSchema.activeView.id),
          eq(activeView.tenantId, OrdersSchema.activeView.tenantId),
        ),
      )
      .innerJoin(
        BillingAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            OrdersSchema.activeView.billingAccountId,
            BillingAccountManagerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            OrdersSchema.activeView.tenantId,
            BillingAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagedBillingAccountOrderView =
    typeof activeManagedBillingAccountOrderView;
  export type ActiveManagedBillingAccountOrderRow =
    InferSelectViewModel<ActiveManagedBillingAccountOrderView>;

  export const activePlacedOrderView = pgView(
    InvoicesContract.activePlacedOrderViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        customerId: OrdersSchema.activeView.customerId,
      })
      .from(activeView)
      .innerJoin(
        OrdersSchema.activeView,
        and(
          eq(activeView.orderId, OrdersSchema.activeView.id),
          eq(activeView.tenantId, OrdersSchema.activeView.tenantId),
        ),
      ),
  );
  export type ActivePlacedOrderView = typeof activePlacedOrderView;
  export type ActivePlacedOrderRow =
    InferSelectViewModel<ActivePlacedOrderView>;
}
