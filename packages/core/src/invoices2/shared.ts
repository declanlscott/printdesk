import { Either, Schema } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type { ActiveInvoicesView, InvoicesTable } from "./sql";

export const invoiceStatuses = ["processing", "charged", "error"] as const;

export const LineItemV1 = Schema.Struct({
  version: Schema.Literal(1).annotations({
    decodingFallback: () => Either.right(1 as const),
  }),
  name: Schema.String,
  description: Schema.String,
  cost: Schema.Number,
  style: Schema.Literal("OPTION_1", "OPTION_2"),
});
export const LineItem = Schema.Union(LineItemV1);

export const invoicesTableName = "invoices";
export const invoicesTable = SyncTable<InvoicesTable>()(
  invoicesTableName,
  Schema.Struct({
    ...TenantTable.fields,
    lineItems: Schema.Array(LineItem),
    status: Schema.Literal(...invoiceStatuses),
    chargedAt: Schema.NullOr(Schema.Date),
    orderId: NanoId,
  }),
  ["create", "read"],
);

export const activeInvoicesViewName = `active_${invoicesTableName}`;
export const activeInvoicesView = View<ActiveInvoicesView>()(
  activeInvoicesViewName,
  invoicesTable.Schema,
);

export const CreateInvoice = Schema.extend(
  Schema.Struct({
    status: Schema.Literal("processing"),
  }),
  invoicesTable.Schema.omit("status", "chargedAt", "deletedAt", "tenantId"),
);

export const Estimate = Schema.Struct({
  total: Schema.Number,
  description: Schema.optional(Schema.String),
  items: Schema.Array(LineItem),
});
