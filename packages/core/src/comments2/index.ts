import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { Database } from "../database2";
import { Orders } from "../orders2";
import { activeOrdersView } from "../orders2/sql";
import { Sync } from "../sync2";
import { createComment, deleteComment, updateComment } from "./shared";
import { activeCommentsView, commentsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorization } from "../billing-accounts2/sql";
import type { Order } from "../orders2/sql";
import type { Comment, CommentsTable } from "./sql";

export namespace Comments {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/comments/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = commentsTable;
        const activeView = activeCommentsView;

        const create = Effect.fn("Comments.Repository.create")(
          (comment: InferInsertModel<CommentsTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(comment).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Comments.Repository.getMetadata")(
          (tenantId: Comment["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Comments.Repository.getActiveMetadata",
        )((tenantId: Comment["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByOrderBillingAccountManagerId = Effect.fn(
          "Comments.Repository.getActiveMetadataByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            tenantId: Comment["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .innerJoin(
                  activeOrdersView,
                  and(
                    eq(activeView.orderId, activeOrdersView.id),
                    eq(activeView.tenantId, activeOrdersView.tenantId),
                  ),
                )
                .innerJoin(
                  activeBillingAccountsView,
                  and(
                    eq(
                      activeOrdersView.billingAccountId,
                      activeBillingAccountsView.id,
                    ),
                    eq(
                      activeOrdersView.tenantId,
                      activeBillingAccountsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeBillingAccountManagerAuthorizationsView,
                  and(
                    eq(
                      activeBillingAccountsView.id,
                      activeBillingAccountManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeBillingAccountsView.tenantId,
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(
                    eq(
                      activeBillingAccountManagerAuthorizationsView.managerId,
                      managerId,
                    ),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const getActiveMetadataByOrderCustomerId = Effect.fn(
          "Comments.Repository.getActiveMetadataByOrderCustomerId",
        )((customerId: Order["customerId"], tenantId: Comment["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .innerJoin(
                activeOrdersView,
                and(
                  eq(activeView.orderId, activeOrdersView.id),
                  eq(activeView.tenantId, activeOrdersView.tenantId),
                ),
              )
              .where(
                and(
                  eq(activeOrdersView.customerId, customerId),
                  eq(activeView.tenantId, tenantId),
                ),
              ),
          ),
        );

        const findById = Effect.fn("Comments.Repository.findById")(
          (id: Comment["id"], tenantId: Comment["tenantId"]) =>
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
          (ids: ReadonlyArray<Comment["id"]>, tenantId: Comment["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const updateById = Effect.fn("Comments.Repository.updateById")(
          (
            id: Comment["id"],
            comment: Partial<Omit<Comment, "id" | "tenantId">>,
            tenantId: Comment["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(comment)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("Comments.Repository.deleteById")(
          (
            id: Comment["id"],
            deletedAt: NonNullable<Comment["deletedAt"]>,
            tenantId: Comment["tenantId"],
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

        const deleteByOrderId = Effect.fn(
          "Comments.Repository.deleteByOrderId",
        )(
          (
            orderId: Comment["orderId"],
            deletedAt: NonNullable<Comment["deletedAt"]>,
            tenantId: Comment["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(
                    and(
                      eq(table.orderId, orderId),
                      eq(table.tenantId, tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByOrderBillingAccountManagerId,
          getActiveMetadataByOrderCustomerId,
          findById,
          findByIds,
          updateById,
          deleteById,
          deleteByOrderId,
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
          (commentId: Comment["id"]) =>
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

  export class SyncMutations extends Effect.Service<SyncMutations>()(
    "@printdesk/core/comments/SyncMutations",
    {
      dependencies: [Policy.Default, Orders.Policy.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const policy = yield* Policy;
        const ordersPolicy = yield* Orders.Policy;

        const create = Sync.Mutation(
          createComment,
          ({ orderId }) =>
            AccessControl.some(
              AccessControl.permission("comments:create"),
              ordersPolicy.isCustomerOrManager(orderId),
              ordersPolicy.hasActiveManagerAuthorization(orderId),
            ),
          (comment, session) =>
            repository.create({
              ...comment,
              authorId: session.userId,
              tenantId: session.tenantId,
            }),
        );

        const update = Sync.Mutation(
          updateComment,
          ({ id }) =>
            AccessControl.some(
              AccessControl.permission("comments:update"),
              policy.isAuthor(id),
            ),
          ({ id, ...comment }, session) =>
            repository.updateById(id, comment, session.tenantId),
        );

        const delete_ = Sync.Mutation(
          deleteComment,
          ({ id }) =>
            AccessControl.some(
              AccessControl.permission("comments:delete"),
              policy.isAuthor(id),
            ),
          ({ id, deletedAt }, session) =>
            repository.deleteById(id, deletedAt, session.tenantId),
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
