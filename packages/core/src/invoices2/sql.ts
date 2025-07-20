import { isNull } from "drizzle-orm";
import { index, pgView, timestamp } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  customEnum,
  customJsonb,
  id,
  SyncTable,
  tenantTable,
  View,
} from "../database2/constructors";
import { invoicesTableName, invoiceStatuses, LineItem } from "./shared";

import type { InferFromTable } from "../database2/constructors";

const invoiceStatus = (name: string) => customEnum(name, invoiceStatuses);

export const invoicesTable = SyncTable(
  tenantTable(
    invoicesTableName,
    {
      lineItems: customJsonb("line_items", Schema.Array(LineItem)).notNull(),
      status: invoiceStatus("status").default("processing").notNull(),
      chargedAt: timestamp("charged_at", { mode: "string" }),
      orderId: id("order_id").notNull(),
    },
    (table) => [index().on(table.orderId)],
  ),
  ["create", "read"],
);

export type InvoicesTable = (typeof invoicesTable)["table"];

export type Invoice = InferFromTable<InvoicesTable>;

export const activeInvoicesView = View(
  pgView(`active_${invoicesTableName}`).as((qb) =>
    qb
      .select()
      .from(invoicesTable.table)
      .where(isNull(invoicesTable.table.deletedAt)),
  ),
);
