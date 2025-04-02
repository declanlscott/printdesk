import * as R from "remeda";
import * as v from "valibot";

import { userRoles } from "../users/shared";
import { nanoIdSchema, tenantTableSchema } from "../utils/shared";

export const commentsTableName = "comments";

export const commentSchema = v.object({
  ...tenantTableSchema.entries,
  orderId: nanoIdSchema,
  authorId: nanoIdSchema,
  content: v.string(),
  visibleTo: v.array(v.picklist(userRoles)),
});

export const createCommentMutationArgsSchema = v.pipe(
  v.object({
    ...v.omit(commentSchema, ["deletedAt"]).entries,
    deletedAt: v.null(),
  }),
  v.transform(({ visibleTo, ...rest }) => ({
    visibleTo: R.unique(visibleTo),
    ...rest,
  })),
);
export type CreateCommentMutationArgs = v.InferOutput<
  typeof createCommentMutationArgsSchema
>;

export const updateCommentMutationArgsSchema = v.object({
  id: nanoIdSchema,
  orderId: nanoIdSchema,
  updatedAt: v.date(),
  ...v.partial(
    v.omit(commentSchema, [
      "id",
      "tenantId",
      "orderId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateCommentMutationArgs = v.InferOutput<
  typeof updateCommentMutationArgsSchema
>;

export const deleteCommentMutationArgsSchema = v.object({
  id: nanoIdSchema,
  orderId: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteCommentMutationArgs = v.InferOutput<
  typeof deleteCommentMutationArgsSchema
>;
