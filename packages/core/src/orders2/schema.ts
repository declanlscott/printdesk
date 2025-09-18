import { and, eq, getViewSelectedFields, isNull, ne } from "drizzle-orm";
import { check, index, pgView } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { SharedAccountManagerAuthorizationsSchema } from "../shared-accounts2/schemas";
import { Tables } from "../tables2";
import { OrdersContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { ColumnsContract } from "../columns2/contract";

export namespace OrdersSchema {
  type OrderRow<TRow> = Omit<
    TRow,
    "roomWorkflowStatusId" | "sharedAccountWorkflowStatusId"
  > &
    (
      | {
          roomWorkflowStatusId: ColumnsContract.EntityId;
          sharedAccountWorkflowStatusId: null;
        }
      | {
          roomWorkflowStatusId: null;
          sharedAccountWorkflowStatusId: ColumnsContract.EntityId;
        }
    );

  export const table = new Tables.Sync(
    OrdersContract.tableName,
    {
      customerId: Columns.entityId.notNull(),
      managerId: Columns.entityId,
      operatorId: Columns.entityId,
      productId: Columns.entityId.notNull(),
      sharedAccountId: Columns.entityId, // null when charging to customer's personal account
      roomWorkflowStatusId: Columns.entityId,
      sharedAccountWorkflowStatusId: Columns.entityId,
      deliveryOptionId: Columns.entityId.notNull(),
      attributes: Columns.jsonb(OrdersContract.Attributes).notNull(),
      approvedAt: Columns.datetime(),
    },
    (table) => [
      index().on(table.customerId),
      index().on(table.sharedAccountId),
      index().on(table.roomWorkflowStatusId),
      index().on(table.sharedAccountWorkflowStatusId),
      check(
        "workflow_status_id_xor",
        ne(
          isNull(table.roomWorkflowStatusId),
          isNull(table.sharedAccountWorkflowStatusId),
        ),
      ),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = OrderRow<InferSelectModel<Table>>;

  export const activeView = pgView(OrdersContract.activeViewName).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = OrderRow<InferSelectViewModel<ActiveView>>;

  export const activeCustomerPlacedView = activeView;
  export type ActiveCustomerPlacedView = typeof activeCustomerPlacedView;
  export type ActiveCustomerPlacedRow = OrderRow<
    InferSelectViewModel<ActiveCustomerPlacedView>
  >;

  export const activeManagerAuthorizedSharedAccountView = pgView(
    OrdersContract.activeManagerAuthorizedSharedAccountViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          SharedAccountManagerAuthorizationsSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.sharedAccountId,
            SharedAccountManagerAuthorizationsSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedSharedAccountView =
    typeof activeManagerAuthorizedSharedAccountView;
  export type ActiveManagerAuthorizedSharedAccountRow = OrderRow<
    InferSelectViewModel<ActiveManagerAuthorizedSharedAccountView>
  >;
}
