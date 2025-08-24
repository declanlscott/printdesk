import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { boolean, index, pgView, text } from "drizzle-orm/pg-core";

import {
  BillingAccountManagerAuthorizationsSchema,
  BillingAccountsSchema,
} from "../billing-accounts2/schemas";
import { id, tenantTable } from "../database2/constructors";
import { OrdersSchema } from "../orders2/schema";
import { CommentsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace CommentsSchema {
  export const table = tenantTable(
    CommentsContract.tableName,
    {
      orderId: id<TableContract.EntityId>("order_id").notNull(),
      authorId: id<TableContract.EntityId>("author_id").notNull(),
      content: text("content").notNull(),
      internal: boolean("internal").notNull().default(false),
    },
    (table) => [index().on(table.orderId)],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(CommentsContract.activeViewName).as((qb) =>
    qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeManagedBillingAccountOrderView = pgView(
    CommentsContract.activeManagedBillingAccountOrderViewName,
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
        BillingAccountsSchema.activeView,
        and(
          eq(
            OrdersSchema.activeView.billingAccountId,
            BillingAccountsSchema.activeView.id,
          ),
          eq(
            OrdersSchema.activeView.tenantId,
            BillingAccountsSchema.activeView.tenantId,
          ),
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
  export type ActiveManagedBillingAccountOrderView =
    typeof activeManagedBillingAccountOrderView;
  export type ActiveManagedBillingAccountOrderRow =
    InferSelectViewModel<ActiveManagedBillingAccountOrderView>;

  export const activePlacedOrderView = pgView(
    CommentsContract.activePlacedOrderViewName,
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
