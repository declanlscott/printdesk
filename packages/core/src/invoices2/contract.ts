import { Effect, Schema } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";

import type { OrdersContract } from "../orders2/contract";
import type { InvoicesSchema } from "./schema";

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

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    lineItems: Schema.Array(LineItem),
    status: Schema.optionalWith(Schema.Literal(...statuses), {
      default: () => "processing",
    }),
    chargedAt: Schema.optionalWith(Schema.NullOr(Schema.DateTimeUtc), {
      default: () => null,
    }),
    orderId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "invoices";
  export const table = TableContract.Sync<InvoicesSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<InvoicesSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activeManagedBillingAccountOrderViewName = `active_managed_billing_account_order_${tableName}`;
  export const activeManagedBillingAccountOrderView =
    TableContract.View<InvoicesSchema.ActiveManagedBillingAccountOrderView>()(
      activeManagedBillingAccountOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: TableContract.EntityId,
      }),
    );

  export const activePlacedOrderViewName = `active_placed_order_${tableName}`;
  export const activePlacedOrderView =
    TableContract.View<InvoicesSchema.ActivePlacedOrderView>()(
      activePlacedOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        customerId: TableContract.EntityId,
      }),
    );

  export const create = new DataAccessContract.Function({
    name: "createInvoice",
    Args: DataTransferStruct.omit(
      "status",
      "chargedAt",
      "deletedAt",
      "tenantId",
    ),
    Returns: DataTransferObject,
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
