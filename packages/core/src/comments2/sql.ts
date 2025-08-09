import { isNull } from "drizzle-orm";
import { boolean, index, pgView, text } from "drizzle-orm/pg-core";

import { id, tenantTable } from "../database2/constructors";
import { CommentsContract } from "./contract";

import type { DatabaseContract } from "../database2/contract";

export const commentsTable = tenantTable(
  CommentsContract.tableName,
  {
    orderId: id("order_id").notNull(),
    authorId: id("author_id").notNull(),
    content: text("content").notNull(),
    internal: boolean("internal").notNull().default(false),
  },
  (table) => [index().on(table.orderId)],
);
export type CommentsTable = typeof commentsTable;
export type Comment = DatabaseContract.InferFromTable<CommentsTable>;

export const activeCommentsView = pgView(CommentsContract.activeViewName).as(
  (qb) =>
    qb.select().from(commentsTable).where(isNull(commentsTable.deletedAt)),
);
export type ActiveCommentsView = typeof activeCommentsView;
export type ActiveComment = DatabaseContract.InferFromView<ActiveCommentsView>;
