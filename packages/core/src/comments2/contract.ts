import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { DatabaseContract } from "../database2/contract";
import { NanoId } from "../utils2/shared";

import type { ActiveCommentsView, CommentsTable } from "./sql";

export namespace CommentsContract {
  export const tableName = "comments";
  export const table = DatabaseContract.SyncTable<CommentsTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      orderId: NanoId,
      authorId: NanoId,
      content: Schema.String,
      internal: Schema.Boolean,
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveCommentsView>()(
    activeViewName,
    table.Schema,
  );

  export const isAuthor = new DataAccess.PolicySignature({
    name: "isCommentAuthor",
    Args: table.Schema.pick("id"),
  });

  export const create = new DataAccess.MutationSignature({
    name: "createComment",
    Args: table.Schema.omit("authorId", "deletedAt", "tenantId"),
  });

  export const update = new DataAccess.MutationSignature({
    name: "updateComment",
    Args: table.Schema.pick("id", "orderId", "updatedAt").pipe(
      Schema.extend(
        table.Schema.omit(
          ...Struct.keys(DatabaseContract.TenantTable.fields),
          "orderId",
          "authorId",
        ).pipe(Schema.partial),
      ),
    ),
  });

  export const delete_ = new DataAccess.MutationSignature({
    name: "deleteComment",
    Args: Schema.Struct({
      ...table.Schema.pick("id", "orderId").fields,
      deletedAt: Schema.DateTimeUtc,
    }),
  });
}
