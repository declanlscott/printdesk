import { index, timestamp } from "drizzle-orm/pg-core";
import { Schema } from "effect";

import {
  customEnum,
  customJsonb,
  id,
  SyncTable,
  tenantTable,
} from "../database2/constructors";
import { invoicesTableName, invoiceStatuses } from "./shared";

import type { InferFromTable } from "../database2/constructors";

const invoiceStatus = (name: string) => customEnum(name, invoiceStatuses);

export const invoicesTable = SyncTable(
  tenantTable(
    invoicesTableName,
    {
      lineItems: customJsonb(
        "line_items",
        // TODO: Line item schema
        Schema.Array(Schema.Struct({})),
      ).notNull(),
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
