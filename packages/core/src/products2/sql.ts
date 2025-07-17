import { index, varchar } from "drizzle-orm/pg-core";

import {
  customEnum,
  customJsonb,
  id,
  SyncTable,
  tenantTable,
} from "../database2/constructors";
import { Constants } from "../utils/constants";
import {
  ProductConfiguration,
  productsTableName,
  productStatuses,
} from "./shared";

import type { InferFromTable } from "../database2/constructors";

const productStatus = (name: string) => customEnum(name, productStatuses);

export const productsTable = SyncTable(
  tenantTable(
    productsTableName,
    {
      name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
      status: productStatus("status").notNull(),
      roomId: id("room_id").notNull(),
      config: customJsonb("config", ProductConfiguration).notNull(),
    },
    (table) => [index().on(table.status), index().on(table.roomId)],
  ),
  ["create", "read", "update", "delete"],
);

export type ProductsTable = (typeof productsTable)["table"];

export type Product = InferFromTable<ProductsTable>;
