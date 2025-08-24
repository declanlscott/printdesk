import { eq, isNull } from "drizzle-orm";
import { index, pgView, varchar } from "drizzle-orm/pg-core";

import { id, jsonb, pgEnum, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { ProductsContract } from "./contract";

import type { InferSelectViewModel } from "drizzle-orm";
import type { TableContract } from "../database2/contract";

export namespace ProductsSchema {
  export const table = tenantTable(
    ProductsContract.tableName,
    {
      name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
      status: pgEnum("status", ProductsContract.statuses).notNull(),
      roomId: id<TableContract.EntityId>("room_id").notNull(),
      config: jsonb("config", ProductsContract.Configuration).notNull(),
    },
    (table) => [index().on(table.status), index().on(table.roomId)],
  );
  export type Table = typeof table;
  export type Row = TableContract.InferDataTransferObject<Table>;

  export const activeView = pgView(ProductsContract.activeViewName).as((qb) =>
    qb.select().from(table).where(isNull(table.deletedAt)),
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
