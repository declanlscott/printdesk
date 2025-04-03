import { index, varchar } from "drizzle-orm/pg-core";

import { customEnum, customJsonb, id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { Constants } from "../utils/constants";
import {
  productConfigurationSchema,
  productsTableName,
  productStatuses,
} from "./shared";

import type { InferTable } from "../drizzle/tables";

export const productStatus = (name: string) =>
  customEnum(name, productStatuses);

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
