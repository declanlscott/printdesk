import { eq, isNull } from "drizzle-orm";
import { index, pgView, varchar } from "drizzle-orm/pg-core";

import { id, jsonb, pgEnum, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { ProductsContract } from "./contract";

import type { TableContract } from "../database2/contract";

export const productsTable = tenantTable(
  ProductsContract.tableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: pgEnum("status", ProductsContract.statuses).notNull(),
    roomId: id<TableContract.EntityId>("room_id").notNull(),
    config: jsonb("config", ProductsContract.Configuration).notNull(),
  },
  (table) => [index().on(table.status), index().on(table.roomId)],
);
export type ProductsTable = typeof productsTable;
export type Product = TableContract.Infer<ProductsTable>;

export const activeProductsView = pgView(ProductsContract.activeViewName).as(
  (qb) =>
    qb.select().from(productsTable).where(isNull(productsTable.deletedAt)),
);
export type ActiveProductsView = typeof activeProductsView;
export type ActiveProduct = TableContract.InferFromView<ActiveProductsView>;

export const activePublishedProductsView = pgView(
  ProductsContract.activePublishedViewName,
).as((qb) =>
  qb
    .select()
    .from(activeProductsView)
    .where(eq(activeProductsView.status, "published")),
);
export type ActivePublishedProductsView = typeof activePublishedProductsView;
export type ActivePublishedProduct =
  TableContract.InferFromView<ActivePublishedProductsView>;
