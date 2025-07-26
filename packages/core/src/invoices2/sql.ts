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
import {
  activeInvoicesViewName,
  invoicesTableName,
  invoiceStatuses,
  LineItem,
} from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

export const invoicesTable = tenantTable(
  invoicesTableName,
  {
    lineItems: jsonb("line_items", Schema.Array(LineItem)).notNull(),
    status: pgEnum("status", invoiceStatuses).default("processing").notNull(),
    chargedAt: datetime("charged_at"),
    orderId: id("order_id").notNull(),
  },
  (table) => [index().on(table.orderId)],
);
export type InvoicesTable = typeof invoicesTable;
export type Invoice = InferFromTable<InvoicesTable>;

export const activeInvoicesView = pgView(activeInvoicesViewName).as((qb) =>
  qb.select().from(invoicesTable).where(isNull(invoicesTable.deletedAt)),
);
export type ActiveInvoicesView = typeof activeInvoicesView;
export type ActiveInvoice = InferFromView<ActiveInvoicesView>;
