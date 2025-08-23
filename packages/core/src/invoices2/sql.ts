import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import { activeBillingAccountManagerAuthorizationsView } from "../billing-accounts2/sql";
import {
  datetime,
  id,
  jsonb,
  pgEnum,
  tenantTable,
} from "../database2/constructors";
import { activeOrdersView } from "../orders2/sql";
import { InvoicesContract } from "./contract";

import type { TableContract } from "../database2/contract";

export const invoicesTable = tenantTable(
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
export type InvoicesTable = typeof invoicesTable;
export type Invoice = TableContract.Infer<InvoicesTable>;

export const activeInvoicesView = pgView(InvoicesContract.activeViewName).as(
  (qb) =>
    qb.select().from(invoicesTable).where(isNull(invoicesTable.deletedAt)),
);
export type ActiveInvoicesView = typeof activeInvoicesView;
export type ActiveInvoice = TableContract.InferFromView<ActiveInvoicesView>;

export const activeManagedBillingAccountOrderInvoicesView = pgView(
  InvoicesContract.activeManagedBillingAccountOrderViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeInvoicesView),
      authorizedManagerId:
        activeBillingAccountManagerAuthorizationsView.managerId,
    })
    .from(activeInvoicesView)
    .innerJoin(
      activeOrdersView,
      and(
        eq(activeInvoicesView.orderId, activeOrdersView.id),
        eq(activeInvoicesView.tenantId, activeOrdersView.tenantId),
      ),
    )
    .innerJoin(
      activeBillingAccountManagerAuthorizationsView,
      and(
        eq(
          activeOrdersView.billingAccountId,
          activeBillingAccountManagerAuthorizationsView.billingAccountId,
        ),
        eq(
          activeOrdersView.tenantId,
          activeBillingAccountManagerAuthorizationsView.tenantId,
        ),
      ),
    ),
);
export type ActiveManagedBillingAccountOrderInvoicesView =
  typeof activeManagedBillingAccountOrderInvoicesView;
export type ActiveManagedBillingAccountOrderInvoice =
  TableContract.InferFromView<ActiveManagedBillingAccountOrderInvoicesView>;

export const activePlacedOrderInvoicesView = pgView(
  InvoicesContract.activePlacedOrderViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeInvoicesView),
      customerId: activeOrdersView.customerId,
    })
    .from(activeInvoicesView)
    .innerJoin(
      activeOrdersView,
      and(
        eq(activeInvoicesView.orderId, activeOrdersView.id),
        eq(activeInvoicesView.tenantId, activeOrdersView.tenantId),
      ),
    ),
);
export type ActivePlacedOrderInvoicesView =
  typeof activePlacedOrderInvoicesView;
export type ActivePlacedOrderInvoice =
  TableContract.InferFromView<ActivePlacedOrderInvoicesView>;
