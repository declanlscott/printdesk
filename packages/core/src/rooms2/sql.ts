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

import {
  customEnum,
  id,
  tenantTable,
  version,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  activePublishedRoomDeliveryOptionsViewName,
  activePublishedRoomsViewName,
  activePublishedRoomWorkflowStatusesViewName,
  activeRoomsViewName,
  deliveryOptionsTableName,
  roomsTableName,
  roomStatuses,
  workflowStatusesTableName,
  workflowStatusTypes,
} from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

const roomStatus = (name: string) => customEnum(name, roomStatuses);
export const roomsTable = tenantTable(
  roomsTableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: roomStatus("status").notNull(),
    details: text("details"),
  },
  (table) => [
    unique().on(table.name, table.tenantId),
    index().on(table.status),
  ],
);
export type RoomsTable = typeof roomsTable;
export type Room = InferFromTable<RoomsTable>;
export const activeRoomsView = pgView(activeRoomsViewName).as((qb) =>
  qb.select().from(roomsTable).where(isNull(roomsTable.deletedAt)),
);
export type ActiveRoomsView = typeof activeRoomsView;
export type ActiveRoom = InferFromView<ActiveRoomsView>;
export const activePublishedRoomsView = pgView(activePublishedRoomsViewName).as(
  (qb) =>
    qb
      .select()
      .from(activeRoomsView)
      .where(eq(activeRoomsView.status, "published")),
);
export type ActivePublishedRoomsView = typeof activePublishedRoomsView;
export type ActivePublishedRoom = InferFromView<ActivePublishedRoomsView>;

const workflowStatusType = (name: string) =>
  customEnum(name, workflowStatusTypes);
export const workflowStatusesTable = pgTable(
  workflowStatusesTableName,
  {
    id: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    type: workflowStatusType("type").notNull(),
    charging: boolean("charging").notNull(),
    color: varchar("color", { length: 9 }),
    index: smallint("index").notNull(),
    roomId: id("room_id").notNull(),
    tenantId: id("tenant_id").notNull(),
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
export type WorkflowStatus = InferFromTable<WorkflowStatusesTable>;
export const activePublishedRoomWorkflowStatusesView = pgView(
  activePublishedRoomWorkflowStatusesViewName,
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
  InferFromView<ActivePublishedRoomWorkflowStatusesView>;

export const deliveryOptionsTable = pgTable(
  deliveryOptionsTableName,
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
    roomId: id("room_id").notNull(),
    tenantId: id("tenant_id").notNull(),
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
export type DeliveryOption = InferFromTable<DeliveryOptionsTable>;
export const activePublishedRoomDeliveryOptionsView = pgView(
  activePublishedRoomDeliveryOptionsViewName,
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
  InferFromView<ActivePublishedRoomDeliveryOptionsView>;
