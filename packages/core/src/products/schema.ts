import { and, eq, getViewSelectedFields, isNull } from "drizzle-orm";
import { index, pgView } from "drizzle-orm/pg-core";

import { Columns } from "../columns";
import { RoomsSchema } from "../rooms/schema";
import { Tables } from "../tables";
import { ProductsContract } from "./contract";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace ProductsSchema {
  export const table = new Tables.Sync(
    "products",
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

  export const activeView = pgView(`active_${table.name}`).as((qb) =>
    qb
      .select()
      .from(table.definition)
      .where(isNull(table.definition.deletedAt)),
  );
  export type ActiveView = typeof activeView;
  export type ActiveRow = InferSelectViewModel<ActiveView>;

  export const activePublishedView = pgView(
    `active_published_${table.name}`,
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
      )
      .where(eq(activeView.status, "published")),
  );
  export type ActivePublishedView = typeof activePublishedView;
  export type ActivePublishedRow = InferSelectViewModel<ActivePublishedView>;
}
