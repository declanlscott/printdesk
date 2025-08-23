import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  smallint,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { id, pgEnum, tenantTable, version } from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "./contracts";

import type { TableContract } from "../database2/contract";

export const roomsTable = tenantTable(
  RoomsContract.tableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: pgEnum("status", RoomsContract.statuses).notNull(),
    details: text("details"),
  },
  (table) => [
    unique().on(table.name, table.tenantId),
    index().on(table.status),
  ],
);
export type RoomsTable = typeof roomsTable;
export type Room = TableContract.Infer<RoomsTable>;
export const activeRoomsView = pgView(RoomsContract.activeViewName).as((qb) =>
  qb.select().from(roomsTable).where(isNull(roomsTable.deletedAt)),
);
export type ActiveRoomsView = typeof activeRoomsView;
export type ActiveRoom = TableContract.InferFromView<ActiveRoomsView>;
export const activePublishedRoomsView = pgView(
  RoomsContract.activePublishedViewName,
).as((qb) =>
  qb
    .select()
    .from(activeRoomsView)
    .where(eq(activeRoomsView.status, "published")),
);
export type ActivePublishedRoomsView = typeof activePublishedRoomsView;
export type ActivePublishedRoom =
  TableContract.InferFromView<ActivePublishedRoomsView>;

export const workflowStatusesTable = pgTable(
  WorkflowsContract.tableName,
  {
    id: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    type: pgEnum("type", WorkflowsContract.statusTypes).notNull(),
    charging: boolean("charging").notNull(),
    color: varchar("color", { length: 9 }),
    index: smallint("index").notNull(),
    roomId: id<TableContract.EntityId>("room_id").notNull(),
    tenantId: id<TableContract.TenantId>("tenant_id").notNull(),
    ...version,
  },
  (table) => [
    primaryKey({
      columns: [table.id, table.roomId, table.tenantId],
    }),
    unique().on(table.index, table.roomId),
  ],
);
export type WorkflowStatusesTable = typeof workflowStatusesTable;
export type WorkflowStatus = TableContract.Infer<WorkflowStatusesTable>;
export const activePublishedRoomWorkflowStatusesView = pgView(
  WorkflowsContract.activePublishedRoomViewName,
).as((qb) =>
  qb
    .select(getTableColumns(workflowStatusesTable))
    .from(workflowStatusesTable)
    .innerJoin(
      activePublishedRoomsView,
      and(
        eq(workflowStatusesTable.roomId, activePublishedRoomsView.id),
        eq(workflowStatusesTable.tenantId, activePublishedRoomsView.tenantId),
      ),
    ),
);
export type ActivePublishedRoomWorkflowStatusesView =
  typeof activePublishedRoomWorkflowStatusesView;
export type ActivePublishedRoomWorkflowStatus =
  TableContract.InferFromView<ActivePublishedRoomWorkflowStatusesView>;

export const deliveryOptionsTable = pgTable(
  DeliveryOptionsContract.tableName,
  {
    id: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    description: varchar("description", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    detailsLabel: varchar("details_label", {
      length: Constants.VARCHAR_LENGTH,
    }),
    cost: numeric("cost"),
    index: smallint("index").notNull(),
    roomId: id<TableContract.EntityId>("room_id").notNull(),
    tenantId: id<TableContract.TenantId>("tenant_id").notNull(),
    ...version,
  },
  (table) => [
    primaryKey({
      columns: [table.id, table.roomId, table.tenantId],
    }),
    unique().on(table.index, table.roomId),
  ],
);
export type DeliveryOptionsTable = typeof deliveryOptionsTable;
export type DeliveryOption = TableContract.Infer<DeliveryOptionsTable>;
export const activePublishedRoomDeliveryOptionsView = pgView(
  DeliveryOptionsContract.activePublishedRoomViewName,
).as((qb) =>
  qb
    .select(getTableColumns(deliveryOptionsTable))
    .from(deliveryOptionsTable)
    .innerJoin(
      activePublishedRoomsView,
      and(
        eq(deliveryOptionsTable.roomId, activePublishedRoomsView.id),
        eq(deliveryOptionsTable.tenantId, activePublishedRoomsView.tenantId),
      ),
    ),
);
export type ActivePublishedRoomDeliveryOptionsView =
  typeof activePublishedRoomDeliveryOptionsView;
export type ActivePublishedRoomDeliveryOption =
  TableContract.InferFromView<ActivePublishedRoomDeliveryOptionsView>;
