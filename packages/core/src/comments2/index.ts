import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Comments {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/comments/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.commentsTable.table;
        const activeView = schema.activeCommentsView.view;
        const activeOrdersView = schema.activeOrdersView.view;
        const activeBillingAccountsView = schema.activeBillingAccountsView.view;
        const activeBillingAccountManagerAuthorizationsView =
          schema.activeBillingAccountManagerAuthorizationsView.view;

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

        const getMetadata = Effect.fn("Comments.Repository.getMetadata")(
          (tenantId: schema.Comment["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Comments.Repository.getActiveMetadata",
        )((tenantId: schema.Comment["tenantId"]) =>
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
            managerId: schema.BillingAccountManagerAuthorization["managerId"],
            tenantId: schema.Comment["tenantId"],
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
        )(
          (
            customerId: schema.Order["customerId"],
            tenantId: schema.Comment["tenantId"],
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
                .where(
                  and(
                    eq(activeOrdersView.customerId, customerId),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
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

        const updateById = Effect.fn("Comments.Repository.updateById")(
          (
            id: schema.Comment["id"],
            comment: Partial<Omit<schema.Comment, "id" | "tenantId">>,
            tenantId: schema.Tenant["id"],
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

        const deleteByOrderId = Effect.fn(
          "Comments.Repository.deleteByOrderId",
        )(
          (
            orderId: schema.Comment["orderId"],
            deletedAt: NonNullable<schema.Comment["deletedAt"]>,
            tenantId: schema.Comment["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ deletedAt })
                .where(
                  and(eq(table.orderId, orderId), eq(table.tenantId, tenantId)),
                )
                .returning(),
            ),
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
