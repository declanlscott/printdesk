import { Schema } from "effect";

import { DataAccess } from "../data-access2";
import { DatabaseContract } from "../database2/contract";
import { NanoId } from "../utils2/shared";

import type { OrdersContract } from "../orders2/contract";
import type { ActiveInvoicesView, InvoicesTable } from "./sql";

export namespace InvoicesContract {
  export const statuses = ["processing", "charged", "error"] as const;

  export const LineItemV1 = Schema.TaggedStruct("LineItemV1", {
    name: Schema.String,
    description: Schema.String,
    cost: Schema.Number,
    style: Schema.Literal("OPTION_1", "OPTION_2"),
  });
  export const LineItem = Schema.Union(LineItemV1);

  export const tableName = "invoices";
  export const table = DatabaseContract.SyncTable<InvoicesTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      lineItems: Schema.Array(LineItem),
      status: Schema.Literal(...statuses),
      chargedAt: Schema.NullOr(Schema.DateTimeUtc),
      orderId: NanoId,
    }),
    ["create", "read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveInvoicesView>()(
    activeViewName,
    table.Schema,
  );

  export const create = new DataAccess.Function({
    name: "createInvoice",
    Args: table.Schema.omit("status", "chargedAt", "deletedAt", "tenantId"),
  });

  export const Estimate = Schema.Struct({
    total: Schema.Number,
    description: Schema.optional(Schema.String),
    items: Schema.Array(LineItem),
  });

  export const estimateCost = (
    order: Schema.Schema.Type<typeof OrdersContract.Attributes>,
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
}
