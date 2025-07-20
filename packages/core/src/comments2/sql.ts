import { isNull } from "drizzle-orm";
import { boolean, index, pgView, text } from "drizzle-orm/pg-core";

import { id, SyncTable, tenantTable, View } from "../database2/constructors";
import { commentsTableName } from "./shared";

import type { InferFromTable } from "../database2/constructors";

export const commentsTable = SyncTable(
  tenantTable(
    commentsTableName,
    {
      orderId: id("order_id").notNull(),
      authorId: id("author_id").notNull(),
      content: text("content").notNull(),
      internal: boolean("internal").notNull().default(false),
    },
    (table) => [index().on(table.orderId)],
  ),
  ["create", "read", "update", "delete"],
);

export type CommentsTable = (typeof commentsTable)["table"];

export type Comment = InferFromTable<CommentsTable>;

export const activeCommentsView = View(
  pgView(`active_${commentsTableName}`).as((qb) =>
    qb
      .select()
      .from(commentsTable.table)
      .where(isNull(commentsTable.table.deletedAt)),
  ),
);
