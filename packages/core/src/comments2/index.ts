import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept } from "../utils/types";

export namespace Comments {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/comments/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.commentsTable.table;

        const create = Effect.fn("Comments.Repository.create")(
          (comment: InferInsertModel<schema.CommentsTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(comment).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findById = Effect.fn("Comments.Repository.findById")(
          (id: schema.Comment["id"], tenantId: schema.Comment["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIds = Effect.fn("Comments.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Comment["id"]>,
            tenantId: schema.Comment["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const update = Effect.fn("Comments.Repository.update")(
          (comment: PartialExcept<schema.Comment, "id" | "tenantId">) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(comment)
                  .where(
                    and(
                      eq(table.id, comment.id),
                      eq(table.tenantId, comment.tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const delete_ = Effect.fn("Comments.Repository.delete")(
          (
            id: schema.Comment["id"],
            deletedAt: NonNullable<schema.Comment["deletedAt"]>,
            tenantId: schema.Comment["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          findById,
          findByIds,
          update,
          delete: delete_,
        } as const;
      }),
    },
  ) {}

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/comments/Policy",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isAuthor = Effect.fn("Comments.Policy.isAuthor")(
          (commentId: schema.Comment["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(commentId, principal.tenantId)
                .pipe(
                  Effect.map(
                    (comment) => comment.authorId === principal.userId,
                  ),
                ),
            ),
        );

        return { isAuthor } as const;
      }),
    },
  ) {}
}
