import {
  and,
  eq,
  getViewSelectedFields,
  isNotNull,
  isNull,
  ne,
  or,
} from "drizzle-orm";
import { check, index, pgView } from "drizzle-orm/pg-core";
import * as Schema from "effect/Schema";

import { Columns } from "../columns";
import { OrdersSchema } from "../orders/schema";
import { SharedAccountManagerAccessSchema } from "../shared-accounts/schemas";
import { Tables } from "../tables";
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
    (table) => [
      index().on(table.orderId),
      check(
        "charged_status",
        or(
          and(
            eq(table.status, "charged" satisfies InvoicesContract.Status),
            isNotNull(table.chargedAt),
          ),
          and(
            ne(table.status, "charged" satisfies InvoicesContract.Status),
            isNull(table.chargedAt),
          ),
        )!,
      ),
    ],
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
          SharedAccountManagerAccessSchema.activeView.managerId,
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
        SharedAccountManagerAccessSchema.activeView,
        and(
          eq(
            OrdersSchema.activeView.sharedAccountId,
            SharedAccountManagerAccessSchema.activeView.sharedAccountId,
          ),
          eq(
            OrdersSchema.activeView.tenantId,
            SharedAccountManagerAccessSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedSharedAccountOrderView =
    typeof activeManagerAuthorizedSharedAccountOrderView;
  export type ActiveManagerAuthorizedBillingAccountOrderRow =
    InferSelectViewModel<ActiveManagerAuthorizedSharedAccountOrderView>;
}
