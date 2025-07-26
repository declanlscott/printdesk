import { eq, isNull } from "drizzle-orm";
import { index, pgView, varchar } from "drizzle-orm/pg-core";

import { id, jsonb, pgEnum, tenantTable } from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  activeProductsViewName,
  activePublishedProductsViewName,
  ProductConfiguration,
  productsTableName,
  productStatuses,
} from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

export const productsTable = tenantTable(
  productsTableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: pgEnum("status", productStatuses).notNull(),
    roomId: id("room_id").notNull(),
    config: jsonb("config", ProductConfiguration).notNull(),
  },
  (table) => [index().on(table.status), index().on(table.roomId)],
);
export type ProductsTable = typeof productsTable;
export type Product = InferFromTable<ProductsTable>;

export const activeProductsView = pgView(activeProductsViewName).as((qb) =>
  qb.select().from(productsTable).where(isNull(productsTable.deletedAt)),
);
export type ActiveProductsView = typeof activeProductsView;
export type ActiveProduct = InferFromView<ActiveProductsView>;

export const activePublishedProductsView = pgView(
  activePublishedProductsViewName,
).as((qb) =>
  qb
    .select()
    .from(activeProductsView)
    .where(eq(activeProductsView.status, "published")),
);
export type ActivePublishedProductsView = typeof activePublishedProductsView;
export type ActivePublishedProduct = InferFromView<ActivePublishedProductsView>;
