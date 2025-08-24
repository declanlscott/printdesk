import { isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { AnnouncementsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace AnnouncementsSchema {
  export const table = tenantTable(AnnouncementsContract.tableName, {
    content: text("content").notNull(),
    roomId: id<TableContract.EntityId>("room_id").notNull(),
    authorId: id<TableContract.EntityId>("author_id").notNull(),
  });
  export type Table = typeof table;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(AnnouncementsContract.activeViewName).as(
    (qb) => qb.select().from(table).where(isNull(table.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;
}
