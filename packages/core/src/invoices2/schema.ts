import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import { Columns } from "../columns2";
import { OrdersSchema } from "../orders2/schema";
import { SharedAccountManagerAuthorizationsSchema } from "../shared-accounts2/schemas";
import { Tables } from "../tables2";
import { InvoicesContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace InvoicesSchema {
  export const table = new Tables.Sync(
    InvoicesContract.tableName,
    {
      lineItems: Columns.jsonb(
        InvoicesContract.LineItem.pipe(Schema.Array),
      ).notNull(),
      status: Columns.union(InvoicesContract.statuses)
        .default("processing")
        .notNull(),
      chargedAt: Columns.datetime(),
      orderId: Columns.entityId.notNull(),
    },
    (table) => [index().on(table.orderId)],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(InvoicesContract.activeViewName).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerPlacedOrderView = pgView(
    InvoicesContract.activeCustomerPlacedOrderViewName,
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
  export type ActiveCustomerPlacedOrderView =
    typeof activeCustomerPlacedOrderView;
  export type ActiveCustomerPlacedOrderRow =
    InferSelectViewModel<ActiveCustomerPlacedOrderView>;

  export const activeManagerAuthorizedSharedAccountOrderView = pgView(
    InvoicesContract.activeManagerAuthorizedSharedAccountOrderViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          SharedAccountManagerAuthorizationsSchema.activeView.managerId,
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
        SharedAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            OrdersSchema.activeView.sharedAccountId,
            SharedAccountManagerAuthorizationsSchema.activeView.sharedAccountId,
          ),
          eq(
            OrdersSchema.activeView.tenantId,
            SharedAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedSharedAccountOrderView =
    typeof activeManagerAuthorizedSharedAccountOrderView;
  export type ActiveManagerAuthorizedBillingAccountOrderRow =
    InferSelectViewModel<ActiveManagerAuthorizedSharedAccountOrderView>;
}
