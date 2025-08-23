import { Effect, Schema } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";

import type { OrdersContract } from "../orders2/contract";
import type {
  ActiveInvoicesView,
  ActiveManagedBillingAccountOrderInvoicesView,
  ActivePlacedOrderInvoicesView,
  InvoicesTable,
} from "./sql";

export namespace InvoicesContract {
  export const statuses = ["processing", "charged", "error"] as const;
  export type Status = (typeof statuses)[number];

  export const LineItemV1 = Schema.TaggedStruct("LineItemV1", {
    name: Schema.String,
    description: Schema.String,
    cost: Schema.Number,
    style: Schema.Literal("OPTION_1", "OPTION_2"),
  });
  export const LineItem = Schema.Union(LineItemV1);

  export const tableName = "invoices";
  export const table = TableContract.Sync<InvoicesTable>()(
    tableName,
    Schema.Struct({
      ...TableContract.Tenant.fields,
      lineItems: Schema.Array(LineItem),
      status: Schema.optionalWith(Schema.Literal(...statuses), {
        default: () => "processing",
      }),
      chargedAt: Schema.optionalWith(Schema.NullOr(Schema.DateTimeUtc), {
        default: () => null,
      }),
      orderId: TableContract.EntityId,
    }),
    ["create", "read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<ActiveInvoicesView>()(
    activeViewName,
    table.Schema,
  );

  export const activeManagedBillingAccountOrderViewName = `active_managed_billing_account_order_${tableName}`;
  export const activeManagedBillingAccountOrderView =
    TableContract.View<ActiveManagedBillingAccountOrderInvoicesView>()(
      activeManagedBillingAccountOrderViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ authorizedManagerId: TableContract.EntityId }),
      ),
    );

  export const activePlacedOrderViewName = `active_placed_order_${tableName}`;
  export const activePlacedOrderView =
    TableContract.View<ActivePlacedOrderInvoicesView>()(
      activePlacedOrderViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ customerId: TableContract.EntityId }),
      ),
    );

  export const create = new DataAccessContract.Function({
    name: "createInvoice",
    Args: table.Schema.omit("status", "chargedAt", "deletedAt", "tenantId"),
    Returns: table.Schema,
  });

  export class Estimate extends Schema.Class<Estimate>("Estimate")({
    total: Schema.Number,
    description: Schema.optional(Schema.String),
    items: Schema.Array(LineItem),
  }) {}

  export const estimateCost = (
    order: typeof OrdersContract.Attributes.Type,
    script: string,
  ) =>
    Effect.succeed(
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      globalThis.Function(
        "__order__",
        [
          `Object.freeze(__order__);`,
          script,
          `return estimateCost(__order__);`,
        ].join("\n"),
      ),
    ).pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      Effect.map((fn) => fn.apply(undefined, [order])),
      Effect.flatMap(Schema.decodeUnknown(Estimate)),
    );
}
