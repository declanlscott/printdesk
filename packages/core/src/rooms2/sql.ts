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
  SyncTable,
  tenantTable,
  version,
  View,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  deliveryOptionsTableName,
  roomsTableName,
  roomStatuses,
  workflowStatusesTableName,
  workflowStatusTypes,
} from "./shared";

import type { InferFromTable } from "../database2/constructors";

const roomStatus = (name: string) => customEnum(name, roomStatuses);

export const roomsTable = SyncTable(
  tenantTable(
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
  ),
  ["create", "read", "update", "delete"],
);
export type RoomsTable = (typeof roomsTable)["table"];
export type Room = InferFromTable<RoomsTable>;
export const activeRoomsView = View(
  pgView(`active_${roomsTableName}`).as((qb) =>
    qb
      .select()
      .from(roomsTable.table)
      .where(isNull(roomsTable.table.deletedAt)),
  ),
);
export const activePublishedRoomsView = View(
  pgView(`active_published_${roomsTableName}`).as((qb) =>
    qb
      .select()
      .from(activeRoomsView.view)
      .where(eq(activeRoomsView.view.status, "published")),
  ),
);

const workflowStatusType = (name: string) =>
  customEnum(name, workflowStatusTypes);

export const workflowStatusesTable = SyncTable(
  pgTable(
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
  ),
  ["create", "read"],
);
export type WorkflowStatusesTable = (typeof workflowStatusesTable)["table"];
export type WorkflowStatus = InferFromTable<WorkflowStatusesTable>;
export const publishedRoomWorkflowStatusesView = View(
  pgView(`published_room_${workflowStatusesTableName}`).as((qb) =>
    qb
      .select(getTableColumns(workflowStatusesTable.table))
      .from(workflowStatusesTable.table)
      .innerJoin(
        roomsTable.table,
        and(
          eq(workflowStatusesTable.table.roomId, roomsTable.table.id),
          eq(workflowStatusesTable.table.tenantId, roomsTable.table.tenantId),
        ),
      )
      .where(eq(roomsTable.table.status, "published")),
  ),
);

export const deliveryOptionsTable = SyncTable(
  pgTable(
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
  ),
  ["create", "read"],
);
export type DeliveryOptionsTable = (typeof deliveryOptionsTable)["table"];
export type DeliveryOption = InferFromTable<DeliveryOptionsTable>;
export const publishedRoomDeliveryOptionsView = View(
  pgView(`published_room_${deliveryOptionsTableName}`).as((qb) =>
    qb
      .select(getTableColumns(deliveryOptionsTable.table))
      .from(deliveryOptionsTable.table)
      .innerJoin(
        roomsTable.table,
        and(
          eq(deliveryOptionsTable.table.roomId, roomsTable.table.id),
          eq(deliveryOptionsTable.table.tenantId, roomsTable.table.tenantId),
        ),
      )
      .where(eq(roomsTable.table.status, "published")),
  ),
);
