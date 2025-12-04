import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";

import type { OrdersContract } from "../orders/contract";
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
    ...ColumnsContract.Tenant.fields,
    lineItems: LineItem.pipe(Schema.Array),
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "processing" }),
    ),
    chargedAt: Schema.DateTimeUtc.pipe(
      Schema.NullOr,
      Schema.optionalWith({ default: () => null }),
    ),
    orderId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "invoices";
  export const table = new (TablesContract.makeClass<InvoicesSchema.Table>())(
    tableName,
    DataTransferObject,
    ["create", "read"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<InvoicesSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeManagerAuthorizedSharedAccountOrderViewName = `active_manager_authorized_shared_account_order_${tableName}`;
  export const activeManagerAuthorizedSharedAccountOrderView =
    new (TablesContract.makeViewClass<InvoicesSchema.ActiveManagerAuthorizedSharedAccountOrderView>())(
      activeManagerAuthorizedSharedAccountOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: ColumnsContract.EntityId,
      }),
    );

  export const activeCustomerPlacedOrderViewName = `active_customer_placed_order_${tableName}`;
  export const activeCustomerPlacedOrderView =
    new (TablesContract.makeViewClass<InvoicesSchema.ActiveCustomerPlacedOrderView>())(
      activeCustomerPlacedOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        customerId: ColumnsContract.EntityId,
      }),
    );

  export const create = new ProceduresContract.Procedure({
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
    items: LineItem.pipe(Schema.Array),
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
