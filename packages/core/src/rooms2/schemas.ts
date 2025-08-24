import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgView,
  smallint,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { id, pgEnum, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace RoomsSchema {
  export const table = tenantTable(
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
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(RoomsContract.activeViewName).as((qb) =>
    qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedView = pgView(
    RoomsContract.activePublishedViewName,
  ).as((qb) =>
    qb.select().from(activeView).where(eq(activeView.status, "published")),
  );
  export type ActivePublishedView = typeof activePublishedView;
  export type ActivePublishedRow = InferSelectViewModel<ActivePublishedView>;
}

export namespace WorkflowStatusesSchema {
  export const table = tenantTable(
    WorkflowsContract.tableName,
    {
      name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
      type: pgEnum("type", WorkflowsContract.statusTypes).notNull(),
      charging: boolean("charging").notNull(),
      color: varchar("color", { length: 9 }),
      index: smallint("index").notNull(),
      roomId: id<TableContract.EntityId>("room_id").notNull(),
    },
    (table) => [unique().on(table.index, table.roomId)],
  );
  export type Table = typeof table;
  export type Row = TableContract.InferDataTransferObject<Table>;

  export const activePublishedRoomView = pgView(
    WorkflowsContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getTableColumns(table))
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

export namespace DeliveryOptionsSchema {
  export const table = tenantTable(
    DeliveryOptionsContract.tableName,
    {
      name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
      description: varchar("description", {
        length: Constants.VARCHAR_LENGTH,
      }).notNull(),
      detailsLabel: varchar("details_label", {
        length: Constants.VARCHAR_LENGTH,
      }),
      cost: numeric("cost"),
      index: smallint("index").notNull(),
      roomId: id<TableContract.EntityId>("room_id").notNull(),
    },
    (table) => [unique().on(table.index, table.roomId)],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activePublishedRoomView = pgView(
    DeliveryOptionsContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getTableColumns(table))
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
