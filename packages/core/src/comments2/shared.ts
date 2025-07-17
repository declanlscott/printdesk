import { Schema } from "effect";

import { TenantTable } from "../database2/constructors";
import { userRoles } from "../users2/shared";
import { NanoId } from "../utils2/shared";

export const commentsTableName = "comments";

export const Comment = Schema.Struct({
  ...TenantTable.fields,
  orderId: NanoId,
  authorId: NanoId,
  content: Schema.String,
  visibleTo: Schema.transform(
    Schema.Array(Schema.Literal(...userRoles)),
    Schema.Array(Schema.Literal(...userRoles)),
    {
      decode: (arr) => arr,
      encode: (arr) => Array.from(new Set(arr)),
      strict: true,
    },
  ),
});

export const CreateComment = Schema.Struct({
  ...Comment.omit("deletedAt").fields,
  deletedAt: Schema.Null,
});

export const UpdateComment = Schema.extend(
  Schema.Struct({
    id: NanoId,
    orderId: NanoId,
    updatedAt: Schema.Date,
  }),
  Comment.pick("content", "visibleTo").pipe(Schema.partial),
);

export const DeleteComment = Schema.Struct({
  id: NanoId,
  orderId: NanoId,
  deletedAt: Schema.Date,
});
