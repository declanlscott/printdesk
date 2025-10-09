import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { RoomsSchema } from "../rooms2/schema";
import { Tables } from "../tables2";
import { AnnouncementsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace AnnouncementsSchema {
  export const table = new Tables.Sync(AnnouncementsContract.tableName, {
    content: text().notNull(),
    roomId: Columns.entityId.notNull(),
    authorId: Columns.entityId.notNull(),
  });
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(AnnouncementsContract.activeViewName).as(
    (qb) =>
      qb
        .select()
        .from(table.definition)
        .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedRoomView = pgView(
    AnnouncementsContract.activePublishedRoomViewName,
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
