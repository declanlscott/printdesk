import { eq, isNull } from "drizzle-orm";
import { index, pgView, text, unique } from "drizzle-orm/pg-core";

import { pgEnum, tenantTable, varchar } from "../database2/constructors";
import { RoomsContract } from "./contracts";

import type { InferSelectModel, InferSelectViewModel } from "drizzle-orm";

export namespace RoomsSchema {
  export const table = tenantTable(
    RoomsContract.tableName,
    {
      name: varchar("name").notNull(),
      status: pgEnum("status", RoomsContract.statuses)
        .default("draft")
        .notNull(),
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
