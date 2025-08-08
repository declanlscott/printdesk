import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { SyncTable, TenantTable, View } from "../database2/shared";
import { NanoId } from "../utils2/shared";

import type { ActiveCommentsView, CommentsTable } from "./sql";

export const commentsTableName = "comments";
export const comments = SyncTable<CommentsTable>()(
  commentsTableName,
  Schema.Struct({
    ...TenantTable.fields,
    orderId: NanoId,
    authorId: NanoId,
    content: Schema.String,
    internal: Schema.Boolean,
  }),
  ["create", "read", "update", "delete"],
);

export const activeCommentsViewName = `active_${commentsTableName}`;
export const activeComments = View<ActiveCommentsView>()(
  activeCommentsViewName,
  comments.Schema,
);

export const isCommentAuthor = new DataAccess.Policy({
  name: "isCommentAuthor",
  Args: comments.Schema.pick("id"),
});

export const createComment = new DataAccess.Mutation({
  name: "createComment",
  Args: comments.Schema.omit("authorId", "deletedAt", "tenantId"),
});

export const updateComment = new DataAccess.Mutation({
  name: "updateComment",
  Args: comments.Schema.pick("id", "orderId", "updatedAt").pipe(
    Schema.extend(
      comments.Schema.omit(
        ...Struct.keys(TenantTable.fields),
        "orderId",
        "authorId",
      ).pipe(Schema.partial),
    ),
  ),
});

export const deleteComment = new DataAccess.Mutation({
  name: "deleteComment",
  Args: Schema.Struct({
    ...comments.Schema.pick("id", "orderId").fields,
    deletedAt: Schema.DateTimeUtc,
  }),
});
