import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { OrdersContract } from "../orders/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";

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

  export class Table extends TablesContract.Table<InvoicesSchema.Table>(
    "invoices",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("Invoice")({
      lineItems: LineItem.pipe(Schema.Array),
      status: Schema.Literal(...statuses).pipe(
        Schema.optionalWith({ default: () => "processing" }),
      ),
      chargedAt: ColumnsContract.NullableTimestamp,
      orderId: ColumnsContract.EntityId,
    }) {},
    ["create", "read"],
  ) {}

  export class ActiveView extends TablesContract.View<InvoicesSchema.ActiveView>(
    "active_invoices",
  )(
    class Dto extends Schema.Class<Dto>("ActiveInvoice")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveCustomerPlacedOrderView extends TablesContract.View<InvoicesSchema.ActiveCustomerPlacedOrderView>(
    "active_customer_placed_order_invoices",
  )(
    ActiveView.DataTransferObject.pipe(
      Schema.extend(
        OrdersContract.Table.DataTransferObject.pipe(Schema.pick("customerId")),
      ),
    ),
  ) {}

  export class ActiveManagerAuthorizedSharedAccountOrderView extends TablesContract.View<InvoicesSchema.ActiveManagerAuthorizedSharedAccountOrderView>(
    "active_manager_authorized_shared_account_order_invoices",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveManagerAuthorizedSharedAccountOrderInvoice",
    )({ authorizedManagerId: ColumnsContract.EntityId }) {},
  ) {}

  export const create = new ProceduresContract.Procedure({
    name: "createInvoice",
    Args: Table.DataTransferObject.pipe(
      Schema.omit("status", "chargedAt", "deletedAt", "tenantId"),
    ),
    Returns: Table.DataTransferObject,
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

  export const ProcessInvoicePayload = Schema.parseJson(
    Schema.Struct({
      invoiceId: ColumnsContract.EntityId,
      tenantId: ColumnsContract.TenantId,
    }),
  );
}
