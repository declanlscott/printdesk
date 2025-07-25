import { isNull } from "drizzle-orm";
import { index, pgView, timestamp } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  customEnum,
  customJsonb,
  id,
  tenantTable,
} from "../database2/constructors";
import {
  activeInvoicesViewName,
  invoicesTableName,
  invoiceStatuses,
  LineItem,
} from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

const invoiceStatus = (name: string) => customEnum(name, invoiceStatuses);

export const invoicesTable = tenantTable(
  invoicesTableName,
  {
    lineItems: customJsonb("line_items", Schema.Array(LineItem)).notNull(),
    status: invoiceStatus("status").default("processing").notNull(),
    chargedAt: timestamp("charged_at"),
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
