import { eq, isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";

import { Columns } from "../columns2";
import { Tables } from "../tables2";
import { ProductsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace ProductsSchema {
  export const table = new Tables.Sync(
    ProductsContract.tableName,
    {
      name: Columns.varchar().notNull(),
      status: Columns.union(ProductsContract.statuses)
        .default("draft")
        .notNull(),
      roomId: Columns.entityId.notNull(),
      config: Columns.jsonb(ProductsContract.Configuration).notNull(),
    },
    (table) => [index().on(table.status), index().on(table.roomId)],
  );
  export type Table = typeof table.definition;
  export type Row = InferSelectModel<Table>;

  export const activeView = pgView(ProductsContract.activeViewName).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedView = pgView(
    ProductsContract.activePublishedViewName,
  ).as((qb) =>
    qb.select().from(activeView).where(eq(activeView.status, "published")),
  );
  export type ActivePublishedView = typeof activePublishedView;
  export type ActivePublishedRow = InferSelectViewModel<ActivePublishedView>;
}
