import { index, text } from "drizzle-orm/pg-core";

import { customEnumArray, id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { userRoles } from "../users/shared";
import { commentsTableName } from "./shared";

import type { InferFromTable } from "../drizzle/tables";

export const commentsTable = tenantTable(
  commentsTableName,
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    visibleTo: customEnumArray("visible_to", userRoles).notNull(),
  },
  (table) => [index().on(table.orderId), index().on(table.visibleTo)],
);

export type CommentsTable = typeof commentsTable;

export type Comment = InferFromTable<CommentsTable>;
