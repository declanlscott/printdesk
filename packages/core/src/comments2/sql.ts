import { index, text } from "drizzle-orm/pg-core";

import {
  customEnumArray,
  id,
  SyncTable,
  tenantTable,
} from "../database2/constructors";
import { commentsTableName } from "./shared";

import type { InferFromTable } from "../database2/constructors";

export const commentsTable = SyncTable(
  tenantTable(
    commentsTableName,
    {
      orderId: id("order_id").notNull(),
      authorId: id("author_id").notNull(),
      content: text("content").notNull(),
      visibleTo: customEnumArray("visible_to", ["userRoles"]).notNull(),
    },
    (table) => [index().on(table.orderId), index().on(table.visibleTo)],
  ),
  ["create", "read", "update", "delete"],
);

export type CommentsTable = (typeof commentsTable)["table"];

export type Comment = InferFromTable<CommentsTable>;
