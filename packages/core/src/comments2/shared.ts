import { Schema, Struct } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { SyncMutation } from "../sync2/shared";
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

export const createComment = SyncMutation(
  "createComment",
  comments.Schema.omit("authorId", "deletedAt", "tenantId"),
);

export const updateComment = SyncMutation(
  "updateComment",
  Schema.extend(
    comments.Schema.pick("id", "orderId", "updatedAt"),
    comments.Schema.omit(
      ...Struct.keys(TenantTable.fields),
      "orderId",
      "authorId",
    ).pipe(Schema.partial),
  ),
);

export const deleteComment = SyncMutation(
  "deleteComment",
  Schema.Struct({
    ...comments.Schema.pick("id", "orderId").fields,
    deletedAt: Schema.DateTimeUtc,
  }),
);
