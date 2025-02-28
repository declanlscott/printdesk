import { index, varchar } from "drizzle-orm/pg-core";

import { customJsonb, id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { Constants } from "../utils/constants";
import { productStatus } from "../utils/sql";
import { productConfigurationSchema, productsTableName } from "./shared";

import type { InferTable } from "../utils/types";

export const productsTable = tenantTable(
  productsTableName,
  {
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: productStatus("status").notNull(),
    roomId: id("room_id").notNull(),
    config: customJsonb("config", productConfigurationSchema).notNull(),
  },
  (table) => [index().on(table.status), index().on(table.roomId)],
);

export type ProductsTable = typeof productsTable;

export type Product = InferTable<ProductsTable>;
