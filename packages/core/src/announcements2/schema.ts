import { isNull } from "drizzle-orm";
import { pgView, text } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
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
}
