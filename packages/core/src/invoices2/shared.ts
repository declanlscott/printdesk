import { Either, Schema } from "effect";

import { TenantTable } from "../database2/constructors";
import { NanoId } from "../utils2/shared";

export const invoicesTableName = "invoices";
export const invoiceStatuses = ["error", "processing", "charged"] as const;

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

export const Invoice = Schema.Struct({
  ...TenantTable.fields,
  lineItems: Schema.Array(LineItem),
  status: Schema.Literal(...invoiceStatuses),
  chargedAt: Schema.optional(Schema.Date),
  orderId: NanoId,
});

export const CreateInvoice = Schema.Struct({
  status: Schema.Literal("processing"),
  chargedAt: Schema.Null,
  deletedAt: Schema.Null,
});

export const Estimate = Schema.Struct({
  total: Schema.Number,
  description: Schema.optional(Schema.String),
  items: Schema.Array(LineItem),
});
