import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import {
  numeric,
  pgView,
  smallint,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { RoomsSchema } from "../rooms2/schemas";
import { DeliveryOptionsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace DeliveryOptionsSchema {
  export const table = tenantTable(
    DeliveryOptionsContract.tableName,
    {
      name: varchar("name").notNull(),
      description: varchar("description").notNull(),
      detailsLabel: varchar("details_label"),
      cost: numeric("cost"),
      index: smallint("index").notNull(),
      roomId: id<TableContract.EntityId>("room_id").notNull(),
    },
    (table) => [unique().on(table.index, table.roomId, table.tenantId)],
  );
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(DeliveryOptionsContract.activeViewName).as(
    (qb) => qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedRoomView = pgView(
    DeliveryOptionsContract.activePublishedRoomViewName,
  ).as((qb) =>
    qb
      .select(getViewSelectedFields(activeView))
      .from(activeView)
      .innerJoin(
        RoomsSchema.activePublishedView,
        and(
          eq(activeView.roomId, RoomsSchema.activePublishedView.id),
          eq(activeView.tenantId, RoomsSchema.activePublishedView.tenantId),
        ),
      ),
  );
  export type ActivePublishedRoomView = typeof activePublishedRoomView;
  export type ActivePublishedRoomRow =
    InferSelectViewModel<ActivePublishedRoomView>;
}
