import { isNull } from "drizzle-orm";
import { boolean, index, pgView, text } from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { activeCommentsViewName, commentsTableName } from "./shared";

import type { InferFromTable, InferFromView } from "../database2/shared";

export const commentsTable = tenantTable(
  commentsTableName,
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    internal: boolean("internal").notNull().default(false),
  },
  (table) => [index().on(table.orderId)],
);
export type CommentsTable = typeof commentsTable;
export type Comment = InferFromTable<CommentsTable>;

export const activeCommentsView = pgView(activeCommentsViewName).as((qb) =>
  qb.select().from(commentsTable).where(isNull(commentsTable.deletedAt)),
);
export type ActiveCommentsView = typeof activeCommentsView;
export type ActiveComment = InferFromView<ActiveCommentsView>;
