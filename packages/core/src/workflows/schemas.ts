import {
  and,
  eq,
  getTableColumns,
  getViewSelectedFields,
  isNull,
  ne,
} from "drizzle-orm";
import {
  boolean,
  check,
  pgView,
  smallint,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { RoomsSchema } from "../rooms/schema";
import {
  SharedAccountCustomerAccessSchema,
  SharedAccountManagerAccessSchema,
} from "../shared-accounts/schemas";
import { Tables } from "../tables";
import { Constants } from "../utils/constants";
import {
  RoomWorkflowsContract,
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { ColumnsContract } from "../columns/contract";

export namespace RoomWorkflowsSchema {
  export const table = new Tables.Sync(
    RoomWorkflowsContract.tableName,
    { roomId: Columns.entityId.notNull() },
    (table) => [uniqueIndex().on(table.roomId, table.tenantId)],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(RoomWorkflowsContract.activeViewName).as(
    (qb) =>
      qb
        .select()
        .from(table.definition)
        .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedRoomView = pgView(
    RoomWorkflowsContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getViewSelectedFields(activeView))
      .from(table.definition)
      .innerJoin(
        RoomsSchema.activePublishedView,
        and(
          eq(table.definition.roomId, RoomsSchema.activePublishedView.id),
          eq(
            table.definition.tenantId,
            RoomsSchema.activePublishedView.tenantId,
          ),
        ),
      ),
  );
  export type ActivePublishedRoomView = typeof activePublishedRoomView;
  export type ActivePublishedRoomRow =
    InferSelectViewModel<ActivePublishedRoomView>;
}

export namespace SharedAccountWorkflowsSchema {
  export const table = new Tables.Sync(
    SharedAccountWorkflowsContract.tableName,
    { sharedAccountId: Columns.entityId.notNull() },
    (table) => [uniqueIndex().on(table.sharedAccountId, table.tenantId)],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    SharedAccountWorkflowsContract.activeViewName,
  ).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerAuthorizedView = pgView(
    SharedAccountWorkflowsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          SharedAccountCustomerAccessSchema.activeView.customerId,
      })
      .from(SharedAccountCustomerAccessSchema.activeView)
      .innerJoin(
        SharedAccountCustomerAccessSchema.activeView,
        and(
          eq(
            activeView.sharedAccountId,
            SharedAccountCustomerAccessSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountCustomerAccessSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;

  export const activeManagerAuthorizedView = pgView(
    SharedAccountWorkflowsContract.activeManagerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          SharedAccountManagerAccessSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountManagerAccessSchema.activeView,
        and(
          eq(
            activeView.sharedAccountId,
            SharedAccountManagerAccessSchema.activeView.sharedAccountId,
          ),
          eq(
            activeView.tenantId,
            SharedAccountManagerAccessSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedView = typeof activeManagerAuthorizedView;
  export type ActiveManagerAuthorizedRow =
    InferSelectViewModel<ActiveManagerAuthorizedView>;
}

export namespace WorkflowStatusesSchema {
  type WorkflowStatusRow<TRow> = Omit<
    TRow,
    "roomWorkflowId" | "sharedAccountWorkflowId"
  > &
    (
      | {
          roomWorkflowId: ColumnsContract.EntityId;
          sharedAccountWorkflowId: null;
        }
      | {
          roomWorkflowId: null;
          sharedAccountWorkflowId: ColumnsContract.EntityId;
        }
    );

  type RoomWorkflowStatusRow<TRow> = Omit<
    TRow,
    "roomWorkflowId" | "sharedAccountWorkflowId"
  > & {
    sharedAccountWorkflowId: null;
    roomWorkflowId: ColumnsContract.EntityId;
  };

  type SharedAccountWorkflowStatusRow<TRow> = Omit<
    TRow,
    "roomWorkflowId" | "sharedAccountWorkflowId"
  > & {
    sharedAccountWorkflowId: ColumnsContract.EntityId;
    roomWorkflowId: null;
  };

  export const table = new Tables.Sync(
    WorkflowStatusesContract.tableName,
    {
      name: Columns.varchar({
        length: Constants.VARCHAR_LENGTH,
      }).notNull(),
      type: Columns.union(WorkflowStatusesContract.types).notNull(),
      charging: boolean().notNull(),
      color: Columns.varchar({ length: 9 }),
      index: smallint().notNull(),
      sharedAccountWorkflowId: Columns.entityId,
      roomWorkflowId: Columns.entityId,
    },
    (table) => [
      check(
        "workflow_xor",
        ne(isNull(table.sharedAccountWorkflowId), isNull(table.roomWorkflowId)),
      ),
      unique().on(table.sharedAccountWorkflowId, table.index),
      unique().on(table.roomWorkflowId, table.index),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = WorkflowStatusRow<InferSelectModel<Table>>;

  export const activeView = pgView(WorkflowStatusesContract.activeViewName).as(
    (qb) =>
      qb
        .select(getTableColumns(table.definition))
        .from(table.definition)
        .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = WorkflowStatusRow<InferSelectViewModel<ActiveView>>;

  export const activeCustomerAuthorizedSharedAccountView = pgView(
    WorkflowStatusesContract.activeCustomerAuthorizedSharedAccountViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          SharedAccountWorkflowsSchema.activeCustomerAuthorizedView
            .authorizedCustomerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountWorkflowsSchema.activeCustomerAuthorizedView,
        and(
          eq(
            activeView.sharedAccountWorkflowId,
            SharedAccountWorkflowsSchema.activeCustomerAuthorizedView.id,
          ),
          eq(
            activeView.tenantId,
            SharedAccountWorkflowsSchema.activeCustomerAuthorizedView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedSharedAccountView =
    typeof activeCustomerAuthorizedSharedAccountView;
  export type ActiveCustomerAuthorizedSharedAccountRow =
    SharedAccountWorkflowStatusRow<
      InferSelectViewModel<ActiveCustomerAuthorizedSharedAccountView>
    >;

  export const activeManagerAuthorizedSharedAccountView = pgView(
    WorkflowStatusesContract.activeManagerAuthorizedSharedAccountViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          SharedAccountWorkflowsSchema.activeManagerAuthorizedView
            .authorizedManagerId,
      })
      .from(activeView)
      .innerJoin(
        SharedAccountWorkflowsSchema.activeManagerAuthorizedView,
        and(
          eq(
            activeView.sharedAccountWorkflowId,
            SharedAccountWorkflowsSchema.activeManagerAuthorizedView.id,
          ),
          eq(
            activeView.tenantId,
            SharedAccountWorkflowsSchema.activeManagerAuthorizedView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedSharedAccountView =
    typeof activeManagerAuthorizedSharedAccountView;
  export type ActiveManagerAuthorizedSharedAccountRow =
    SharedAccountWorkflowStatusRow<
      InferSelectViewModel<ActiveManagerAuthorizedSharedAccountView>
    >;

  export const activePublishedRoomView = pgView(
    WorkflowStatusesContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getViewSelectedFields(activeView))
      .from(activeView)
      .innerJoin(
        RoomWorkflowsSchema.activePublishedRoomView,
        and(
          eq(
            activeView.roomWorkflowId,
            RoomWorkflowsSchema.activePublishedRoomView.id,
          ),
          eq(
            activeView.tenantId,
            RoomWorkflowsSchema.activePublishedRoomView.tenantId,
          ),
        ),
      ),
  );
  export type ActivePublishedRoomView = typeof activePublishedRoomView;
  export type ActivePublishedRoomRow = RoomWorkflowStatusRow<
    InferSelectViewModel<ActivePublishedRoomView>
  >;
}
