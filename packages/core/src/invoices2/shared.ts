import { Schema } from "effect";

import { DataAccess } from "../data-access2";
import { SyncTable, TenantTable, View } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type { OrderAttributes } from "../orders2/shared";
import type { ActiveInvoicesView, InvoicesTable } from "./sql";

export const invoiceStatuses = ["processing", "charged", "error"] as const;

export const LineItemV1 = Schema.TaggedStruct("LineItemV1", {
  name: Schema.String,
  description: Schema.String,
  cost: Schema.Number,
  style: Schema.Literal("OPTION_1", "OPTION_2"),
});
export const LineItem = Schema.Union(LineItemV1);

export const invoicesTableName = "invoices";
export const invoices = SyncTable<InvoicesTable>()(
  invoicesTableName,
  Schema.Struct({
    ...TenantTable.fields,
    lineItems: Schema.Array(LineItem),
    status: Schema.Literal(...invoiceStatuses),
    chargedAt: Schema.NullOr(Schema.DateTimeUtc),
    orderId: NanoId,
  }),
  ["create", "read"],
);

export const activeInvoicesViewName = `active_${invoicesTableName}`;
export const activeInvoices = View<ActiveInvoicesView>()(
  activeInvoicesViewName,
  invoices.Schema,
);

export const createInvoice = new DataAccess.Mutation({
  name: "createInvoice",
  Args: invoices.Schema.omit("status", "chargedAt", "deletedAt", "tenantId"),
});

export const Estimate = Schema.Struct({
  total: Schema.Number,
  description: Schema.optional(Schema.String),
  items: Schema.Array(LineItem),
});

export const estimateCost = (
  order: Schema.Schema.Type<typeof OrderAttributes>,
  script: string,
) =>
  Schema.decodeUnknown(Estimate)(
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
    Function(
      "__order__",
      [
        `Object.freeze(__order__);`,
        script,
        `return estimateCost(__order__);`,
      ].join("\n"),
    )(order),
  );
