import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { HandlersContract } from "../handlers/contract";
import { OrdersContract } from "../orders/contract";
import { TablesContract } from "../tables/contract";
import { EntityId, TenantId } from "../utils";

import type {
  ActiveCustomerPlacedOrderInvoicesView,
  ActiveInvoicesView,
  ActiveManagerAuthorizedSharedAccountOrderInvoicesView,
  InvoicesTable,
} from "./sql";

export namespace InvoicesContract {
  export const statuses = ["processing", "charged", "error"] as const;
  export type Status = (typeof statuses)[number];

  export class LineItemV1 extends Schema.TaggedClass<LineItemV1>()("InvoiceLineItemV1", {
    name: Schema.String,
    description: Schema.String,
    cost: Schema.Number,
    style: Schema.Literals(["OPTION_1", "OPTION_2"]),
  }) {}
  export const LineItem = Schema.Union([LineItemV1]);

  export class Table extends TablesContract.Table<InvoicesTable>("invoices")(
    {
      ...TablesContract.BaseSyncModel.fields,
      lineItems: LineItem.pipe(Schema.Array),
      status: Schema.Literals(statuses).pipe(
        Schema.withDecodingDefaultType(Effect.succeed(statuses[0])),
        Schema.withConstructorDefault(Effect.succeed(statuses[0])),
      ),
      chargedAt: ColumnsContract.NullableTimestamp,
      orderId: EntityId,
    },
    ["create", "read"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveInvoicesView>(`active_${Table.name}`)(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveCustomerPlacedOrderView extends TablesContract.View<ActiveCustomerPlacedOrderInvoicesView>(
    `active_customer_placed_order_${Table.name}`,
  )({ ...ActiveView.Model.fields, customerId: EntityId }) {}

  export class ActiveManagerAuthorizedSharedAccountOrderView extends TablesContract.View<ActiveManagerAuthorizedSharedAccountOrderInvoicesView>(
    `active_manager_authorized_shared_account_order_${Table.name}`,
  )({ ...ActiveView.Model.fields, authorizedManagerId: EntityId }) {}

  export const create = new HandlersContract.Handler({
    name: "createInvoice",
    Input: Table.Dto.mapFields(Struct.omit(["status", "chargedAt", "deletedAt", "tenantId"])),
    Output: Table.Dto,
  });

  export class Estimate extends Schema.Class<Estimate>("Estimate")({
    total: Schema.Number,
    description: Schema.String.pipe(Schema.optional),
    items: LineItem.pipe(Schema.Array),
  }) {}

  export const estimateCost = (order: typeof OrdersContract.Attributes.Type, script: string) =>
    Effect.succeed(
      globalThis.Function(
        "__order__",
        [`Object.freeze(__order__);`, script, `return estimateCost(__order__);`].join("\n"),
      ),
    ).pipe(
      Effect.tap((fn) => fn(order)),
      Effect.flatMap(Schema.decodeUnknownEffect(Estimate)),
    );

  export const ProcessInvoicePayload = Schema.Struct({
    invoiceId: EntityId,
    tenantId: TenantId,
  }).pipe(Schema.fromJsonString);
}
