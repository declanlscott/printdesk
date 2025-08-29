import {
  and,
  eq,
  getTableColumns,
  getViewSelectedFields,
  isNull,
} from "drizzle-orm";
import {
  boolean,
  pgView,
  smallint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  BillingAccountCustomerAuthorizationsSchema,
  BillingAccountManagerAuthorizationsSchema,
} from "../billing-accounts2/schemas";
import { id, pgEnum, tenantTable } from "../database2/constructors";
import { RoomsSchema } from "../rooms2/schemas";
import { Constants } from "../utils/constants";
import {
  BillingAccountWorkflowsContract,
  RoomWorkflowsContract,
  WorkflowStatusesContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace BillingAccountWorkflowsSchema {
  export const table = tenantTable(
    BillingAccountWorkflowsContract.tableName,
    {
      billingAccountId:
        id<TableContract.EntityId>("billing_account_id").notNull(),
    },
    (table) => [uniqueIndex().on(table.billingAccountId, table.tenantId)],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(
    BillingAccountWorkflowsContract.activeViewName,
  ).as((qb) => qb.select().from(table).where(isNull(table.deletedAt)));
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerAuthorizedView = pgView(
    BillingAccountWorkflowsContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          BillingAccountCustomerAuthorizationsSchema.activeView.customerId,
      })
      .from(BillingAccountCustomerAuthorizationsSchema.activeView)
      .innerJoin(
        BillingAccountCustomerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.billingAccountId,
            BillingAccountCustomerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            activeView.tenantId,
            BillingAccountCustomerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;

  export const activeManagerAuthorizedView = pgView(
    BillingAccountWorkflowsContract.activeManagerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          BillingAccountManagerAuthorizationsSchema.activeView.managerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountManagerAuthorizationsSchema.activeView,
        and(
          eq(
            activeView.billingAccountId,
            BillingAccountManagerAuthorizationsSchema.activeView
              .billingAccountId,
          ),
          eq(
            activeView.tenantId,
            BillingAccountManagerAuthorizationsSchema.activeView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedView = typeof activeManagerAuthorizedView;
  export type ActiveManagerAuthorizedRow =
    InferSelectViewModel<ActiveManagerAuthorizedView>;
}

export namespace RoomWorkflowsSchema {
  export const table = tenantTable(
    RoomWorkflowsContract.tableName,
    { roomId: id<TableContract.EntityId>("room_id").notNull() },
    (table) => [uniqueIndex().on(table.roomId, table.tenantId)],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(RoomWorkflowsContract.activeViewName).as(
    (qb) => qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedRoomView = pgView(
    RoomWorkflowsContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getViewSelectedFields(activeView))
      .from(table)
      .innerJoin(
        RoomsSchema.activePublishedView,
        and(
          eq(table.roomId, RoomsSchema.activePublishedView.id),
          eq(table.tenantId, RoomsSchema.activePublishedView.tenantId),
        ),
      ),
  );
  export type ActivePublishedRoomView = typeof activePublishedRoomView;
  export type ActivePublishedRoomRow =
    InferSelectViewModel<ActivePublishedRoomView>;
}

export namespace WorkflowStatusesSchema {
  export const table = tenantTable(WorkflowStatusesContract.tableName, {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    type: pgEnum("type", WorkflowStatusesContract.types).notNull(),
    charging: boolean("charging").notNull(),
    color: varchar("color", { length: 9 }),
    index: smallint("index").notNull(),
    workflowId: id<TableContract.EntityId>("workflow_id").notNull(),
  });
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(WorkflowStatusesContract.activeViewName).as(
    (qb) =>
      qb
        .select(getTableColumns(table))
        .from(table)
        .where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activeCustomerAuthorizedView = pgView(
    WorkflowStatusesContract.activeCustomerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedCustomerId:
          BillingAccountWorkflowsSchema.activeCustomerAuthorizedView
            .authorizedCustomerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountWorkflowsSchema.activeCustomerAuthorizedView,
        and(
          eq(
            activeView.workflowId,
            BillingAccountWorkflowsSchema.activeCustomerAuthorizedView.id,
          ),
          eq(
            activeView.tenantId,
            BillingAccountWorkflowsSchema.activeCustomerAuthorizedView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveCustomerAuthorizedView =
    typeof activeCustomerAuthorizedView;
  export type ActiveCustomerAuthorizedRow =
    InferSelectViewModel<ActiveCustomerAuthorizedView>;

  export const activeManagerAuthorizedView = pgView(
    WorkflowStatusesContract.activeManagerAuthorizedViewName,
  ).as((qb) =>
    qb
      .select({
        ...getViewSelectedFields(activeView),
        authorizedManagerId:
          BillingAccountWorkflowsSchema.activeManagerAuthorizedView
            .authorizedManagerId,
      })
      .from(activeView)
      .innerJoin(
        BillingAccountWorkflowsSchema.activeManagerAuthorizedView,
        and(
          eq(
            activeView.workflowId,
            BillingAccountWorkflowsSchema.activeManagerAuthorizedView.id,
          ),
          eq(
            activeView.tenantId,
            BillingAccountWorkflowsSchema.activeManagerAuthorizedView.tenantId,
          ),
        ),
      ),
  );
  export type ActiveManagerAuthorizedView = typeof activeManagerAuthorizedView;
  export type ActiveManagerAuthorizedRow =
    InferSelectViewModel<ActiveManagerAuthorizedView>;

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
            activeView.workflowId,
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
  export type ActivePublishedRoomRow =
    InferSelectViewModel<ActivePublishedRoomView>;
}
