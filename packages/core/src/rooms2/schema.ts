import { eq, isNull } from "drizzle-orm";
import { index, pgView, text, unique } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import { RoomsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace RoomsSchema {
  export const table = new Tables.Sync(
    RoomsContract.tableName,
    {
      name: Columns.varchar().notNull(),
      status: Columns.union(RoomsContract.statuses).default("draft").notNull(),
      details: text(),
    },
    (table) => [
      unique().on(table.name, table.tenantId),
      index().on(table.status),
    ],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(RoomsContract.activeViewName).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
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
