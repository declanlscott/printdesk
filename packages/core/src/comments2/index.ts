import {
  and,
  eq,
  getTableName,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Equal, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Orders } from "../orders2";
import { Replicache } from "../replicache2";
import { replicacheClientViewMetadataTable } from "../replicache2/sql";
import { CommentsContract } from "./contract";
import {
  activeCommentsView,
  activeManagedBillingAccountOrderCommentsView,
  activePlacedOrderCommentsView,
  commentsTable,
} from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorization } from "../billing-accounts2/sql";
import type { Order } from "../orders2/sql";
import type { ReplicacheClientViewMetadata } from "../replicache2/sql";
import type { Comment, CommentsTable } from "./sql";

export namespace Comments {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/comments/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = commentsTable;
        const activeView = activeCommentsView;
        const activeManagedBillingAccountOrderView =
          activeManagedBillingAccountOrderCommentsView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

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

        const findCreates = Effect.fn("Comments.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActiveCreates = Effect.fn(
          "Comments.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActiveCreatesByOrderBillingAccountManagerId = Effect.fn(
          "Comments.Repository.findActiveCreatesByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagedBillingAccountOrderView)}_creates`,
                      )
                      .as(
                        tx
                          .selectDistinctOn(
                            [
                              activeManagedBillingAccountOrderView.id,
                              activeManagedBillingAccountOrderView.tenantId,
                            ],
                            Struct.omit(
                              getViewSelectedFields(
                                activeManagedBillingAccountOrderView,
                              ),
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagedBillingAccountOrderView)
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActiveCreatesByOrderCustomerId = Effect.fn(
          "Comments.Repository.findActiveCreatesByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activePlacedOrderCommentsView)}_creates`,
                      )
                      .as(
                        tx
                          .select(
                            Struct.omit(
                              getViewSelectedFields(
                                activePlacedOrderCommentsView,
                              ),
                              "customerId",
                            ),
                          )
                          .from(activePlacedOrderCommentsView)
                          .where(
                            and(
                              eq(
                                activePlacedOrderCommentsView.customerId,
                                customerId,
                              ),
                              eq(
                                activePlacedOrderCommentsView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn("Comments.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Comments.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeView.version,
                                ),
                              ),
                              eq(metadataTable.tenantId, activeView.tenantId),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByOrderBillingAccountManagerId = Effect.fn(
          "Comments.Repository.findActiveUpdatesByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagedBillingAccountOrderView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedBillingAccountOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedBillingAccountOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagedBillingAccountOrderView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagedBillingAccountOrderView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeManagedBillingAccountOrderView.id,
                          activeManagedBillingAccountOrderView.tenantId,
                        ],
                        Struct.omit(
                          cte[
                            getViewName(activeManagedBillingAccountOrderView)
                          ],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByOrderCustomerId = Effect.fn(
          "Comments.Repository.findActiveUpdatesByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activePlacedOrderCommentsView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activePlacedOrderCommentsView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePlacedOrderCommentsView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePlacedOrderCommentsView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePlacedOrderCommentsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activePlacedOrderCommentsView.customerId,
                                customerId,
                              ),
                              eq(
                                activePlacedOrderCommentsView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .select(
                        Struct.omit(
                          cte[getViewName(activePlacedOrderCommentsView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Comments.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "Comments.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletesByOrderBillingAccountManagerId = Effect.fn(
          "Comments.Repository.findActiveDeletesByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .selectDistinctOn(
                          [
                            activeManagedBillingAccountOrderView.id,
                            activeManagedBillingAccountOrderView.tenantId,
                          ],
                          { id: activeManagedBillingAccountOrderView.id },
                        )
                        .from(activeManagedBillingAccountOrderView)
                        .where(
                          and(
                            eq(
                              activeManagedBillingAccountOrderView.authorizedManagerId,
                              managerId,
                            ),
                            eq(
                              activeManagedBillingAccountOrderView.tenantId,
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletesByOrderCustomerId = Effect.fn(
          "Comments.Repository.findActiveDeletesByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activePlacedOrderCommentsView.id })
                        .from(activePlacedOrderCommentsView)
                        .where(
                          and(
                            eq(
                              activePlacedOrderCommentsView.customerId,
                              customerId,
                            ),
                            eq(
                              activePlacedOrderCommentsView.tenantId,
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "Comments.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
            excludeIds: Array<Comment["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "Comments.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
            excludeIds: Array<Comment["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByOrderBillingAccountManagerId = Effect.fn(
          "Comments.Repository.findActiveFastForwardByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
            excludeIds: Array<Comment["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagedBillingAccountOrderView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedBillingAccountOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedBillingAccountOrderView.id,
                              ),
                              notInArray(
                                activeManagedBillingAccountOrderView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeManagedBillingAccountOrderView.id,
                          activeManagedBillingAccountOrderView.tenantId,
                        ],
                        Struct.omit(
                          cte[
                            getViewName(activeManagedBillingAccountOrderView)
                          ],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByOrderCustomerId = Effect.fn(
          "Comments.Repository.findActiveFastForwardByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Comment["tenantId"],
            excludeIds: Array<Comment["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activePlacedOrderCommentsView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activePlacedOrderCommentsView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePlacedOrderCommentsView.id,
                              ),
                              notInArray(
                                activePlacedOrderCommentsView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activePlacedOrderCommentsView.customerId,
                                customerId,
                              ),
                              eq(
                                activePlacedOrderCommentsView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .select(
                        Struct.omit(
                          cte[getViewName(activePlacedOrderCommentsView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
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
          findCreates,
          findActiveCreates,
          findActiveCreatesByOrderBillingAccountManagerId,
          findActiveCreatesByOrderCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByOrderBillingAccountManagerId,
          findActiveUpdatesByOrderCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByOrderBillingAccountManagerId,
          findActiveDeletesByOrderCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByOrderBillingAccountManagerId,
          findActiveFastForwardByOrderCustomerId,
          findById,
          updateById,
          deleteById,
          deleteByOrderId,
        } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/comments/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isAuthor = DataAccessContract.makePolicy(
          CommentsContract.isAuthor,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id, principal.tenantId).pipe(
                  Effect.map(({ authorId }) => authorId),
                  Effect.map(Equal.equals(principal.userId)),
                ),
              ),
          }),
        );

        return { isAuthor } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/comments/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Orders.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isCustomerOrManager = yield* Orders.Policies.isCustomerOrManager;
        const hasActiveManagerAuthorization =
          yield* Orders.Policies.hasActiveManagerAuthorization;

        const isAuthor = yield* Policies.isAuthor;

        const create = DataAccessContract.makeMutation(
          CommentsContract.create,
          Effect.succeed({
            makePolicy: ({ orderId }) =>
              AccessControl.some(
                AccessControl.permission("comments:create"),
                isCustomerOrManager.make({ id: orderId }),
                hasActiveManagerAuthorization.make({ id: orderId }),
              ),
            mutator: (comment, session) =>
              repository.create({
                ...comment,
                authorId: session.userId,
                tenantId: session.tenantId,
              }),
          }),
        );

        const update = DataAccessContract.makeMutation(
          CommentsContract.update,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("comments:update"),
                isAuthor.make({ id }),
              ),
            mutator: ({ id, ...comment }, session) =>
              repository.updateById(id, comment, session.tenantId),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          CommentsContract.delete_,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("comments:delete"),
                isAuthor.make({ id }),
              ),
            mutator: ({ id, deletedAt }, session) =>
              repository.deleteById(id, deletedAt, session.tenantId),
          }),
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
