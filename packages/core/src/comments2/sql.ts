import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { boolean, index, pgView, text } from "drizzle-orm/pg-core";

import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { id, tenantTable } from "../database2/constructors";
import { activeOrdersView } from "../orders2/sql";
import { CommentsContract } from "./contract";

import type { DatabaseContract } from "../database2/contract";

export const commentsTable = tenantTable(
  CommentsContract.tableName,
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    internal: boolean("internal").notNull().default(false),
  },
  (table) => [index().on(table.orderId)],
);
export type CommentsTable = typeof commentsTable;
export type Comment = DatabaseContract.InferFromTable<CommentsTable>;

export const activeCommentsView = pgView(CommentsContract.activeViewName).as(
  (qb) =>
    qb.select().from(commentsTable).where(isNull(commentsTable.deletedAt)),
);
export type ActiveCommentsView = typeof activeCommentsView;
export type ActiveComment = DatabaseContract.InferFromView<ActiveCommentsView>;

export const activeManagedBillingAccountOrderCommentsView = pgView(
  CommentsContract.activeManagedBillingAccountOrderViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeCommentsView),
      authorizedManagerId:
        activeBillingAccountManagerAuthorizationsView.managerId,
    })
    .from(activeCommentsView)
    .innerJoin(
      activeOrdersView,
      and(
        eq(activeCommentsView.orderId, activeOrdersView.id),
        eq(activeCommentsView.tenantId, activeOrdersView.tenantId),
      ),
    )
    .innerJoin(
      activeBillingAccountsView,
      and(
        eq(activeOrdersView.billingAccountId, activeBillingAccountsView.id),
        eq(activeOrdersView.tenantId, activeBillingAccountsView.tenantId),
      ),
    )
    .innerJoin(
      activeBillingAccountManagerAuthorizationsView,
      and(
        eq(
          activeBillingAccountsView.id,
          activeBillingAccountManagerAuthorizationsView.billingAccountId,
        ),
        eq(
          activeBillingAccountsView.tenantId,
          activeBillingAccountManagerAuthorizationsView.tenantId,
        ),
      ),
    ),
);
export type ActiveManagedBillingAccountOrderCommentsView =
  typeof activeManagedBillingAccountOrderCommentsView;
export type ActiveManagedBillingAccountOrderComment =
  DatabaseContract.InferFromView<ActiveManagedBillingAccountOrderCommentsView>;

export const activePlacedOrderCommentsView = pgView(
  CommentsContract.activePlacedOrderViewName,
).as((qb) =>
  qb
    .select({
      ...getViewSelectedFields(activeCommentsView),
      customerId: activeOrdersView.customerId,
    })
    .from(activeCommentsView)
    .innerJoin(
      activeOrdersView,
      and(
        eq(activeCommentsView.orderId, activeOrdersView.id),
        eq(activeCommentsView.tenantId, activeOrdersView.tenantId),
      ),
    ),
);
export type ActivePlacedOrderCommentsView =
  typeof activePlacedOrderCommentsView;
export type ActivePlacedOrderComment =
  DatabaseContract.InferFromView<ActivePlacedOrderCommentsView>;
