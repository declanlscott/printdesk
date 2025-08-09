import { isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  datetime,
  id,
  jsonb,
  pgEnum,
  tenantTable,
} from "../database2/constructors";
import { InvoicesContract } from "./contract";

import type { DatabaseContract } from "../database2/contract";

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
    orderId: id("order_id").notNull(),
  },
  (table) => [index().on(table.orderId)],
);
export type InvoicesTable = typeof invoicesTable;
export type Invoice = DatabaseContract.InferFromTable<InvoicesTable>;

export const activeInvoicesView = pgView(InvoicesContract.activeViewName).as(
  (qb) =>
    qb.select().from(invoicesTable).where(isNull(invoicesTable.deletedAt)),
);
export type ActiveInvoicesView = typeof activeInvoicesView;
export type ActiveInvoice = DatabaseContract.InferFromView<ActiveInvoicesView>;
