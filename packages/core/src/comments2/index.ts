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
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Events } from "../events2";
import { Orders } from "../orders2";
import { OrdersContract } from "../orders2/contract";
import { Permissions } from "../permissions2";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { CommentsContract } from "./contract";
import { CommentsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";

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
        const table = CommentsSchema.table.definition;
        const activeView = CommentsSchema.activeView;
        const activeManagedSharedAccountOrderView =
          CommentsSchema.activeManagerAuthorizedSharedAccountOrderView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

        const create = Effect.fn("Comments.Repository.create")(
          (comment: InferInsertModel<CommentsSchema.Table>) =>
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.Row["tenantId"],
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
                      .with(cte)
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveRow["tenantId"],
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
                      .with(cte)
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

        const findActiveCustomerPlacedOrderCreates = Effect.fn(
          "Comments.Repository.findActiveCustomerPlacedOrderCreates",
        )(
          (
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveCustomerPlacedOrderRow["tenantId"],
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
                        `${getViewName(CommentsSchema.activeCustomerPlacedOrderView)}_creates`,
                      )
                      .as(
                        tx
                          .select(
                            Struct.omit(
                              getViewSelectedFields(
                                CommentsSchema.activeCustomerPlacedOrderView,
                              ),
                              "customerId",
                            ),
                          )
                          .from(CommentsSchema.activeCustomerPlacedOrderView)
                          .where(
                            and(
                              eq(
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .customerId,
                                customerId,
                              ),
                              eq(
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
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

        const findActiveManagerAuthorizedSharedAccountOrderCreates = Effect.fn(
          "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderCreates",
        )(
          (
            managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["tenantId"],
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
                        `${getViewName(activeManagedSharedAccountOrderView)}_creates`,
                      )
                      .as(
                        tx
                          .selectDistinctOn(
                            [
                              activeManagedSharedAccountOrderView.id,
                              activeManagedSharedAccountOrderView.tenantId,
                            ],
                            Struct.omit(
                              getViewSelectedFields(
                                activeManagedSharedAccountOrderView,
                              ),
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagedSharedAccountOrderView)
                          .where(
                            and(
                              eq(
                                activeManagedSharedAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedSharedAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.Row["tenantId"],
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Comments.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveRow["tenantId"],
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerPlacedOrderUpdates = Effect.fn(
          "Comments.Repository.findActiveCustomerPlacedOrderUpdates",
        )(
          (
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveCustomerPlacedOrderRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(CommentsSchema.activeCustomerPlacedOrderView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            CommentsSchema.activeCustomerPlacedOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                CommentsSchema.activeCustomerPlacedOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  CommentsSchema.activeCustomerPlacedOrderView
                                    .version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .customerId,
                                customerId,
                              ),
                              eq(
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(
                        Struct.omit(
                          cte[
                            getViewName(
                              CommentsSchema.activeCustomerPlacedOrderView,
                            )
                          ],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountOrderUpdates = Effect.fn(
          "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderUpdates",
        )(
          (
            managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagedSharedAccountOrderView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedSharedAccountOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedSharedAccountOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagedSharedAccountOrderView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagedSharedAccountOrderView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedSharedAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedSharedAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[getViewName(activeManagedSharedAccountOrderView)]
                            .id,
                          cte[getViewName(activeManagedSharedAccountOrderView)]
                            .tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeManagedSharedAccountOrderView)],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Comments.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.Row["tenantId"],
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

        const findActiveCustomerPlacedOrderDeletes = Effect.fn(
          "Comments.Repository.findActiveCustomerPlacedOrderDeletes",
        )(
          (
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveCustomerPlacedOrderRow["tenantId"],
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
                        .select({
                          id: CommentsSchema.activeCustomerPlacedOrderView.id,
                        })
                        .from(CommentsSchema.activeCustomerPlacedOrderView)
                        .where(
                          and(
                            eq(
                              CommentsSchema.activeCustomerPlacedOrderView
                                .customerId,
                              customerId,
                            ),
                            eq(
                              CommentsSchema.activeCustomerPlacedOrderView
                                .tenantId,
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountOrderDeletes = Effect.fn(
          "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderDeletes",
        )(
          (
            managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["tenantId"],
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
                            activeManagedSharedAccountOrderView.id,
                            activeManagedSharedAccountOrderView.tenantId,
                          ],
                          { id: activeManagedSharedAccountOrderView.id },
                        )
                        .from(activeManagedSharedAccountOrderView)
                        .where(
                          and(
                            eq(
                              activeManagedSharedAccountOrderView.authorizedManagerId,
                              managerId,
                            ),
                            eq(
                              activeManagedSharedAccountOrderView.tenantId,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.Row["tenantId"],
            excludeIds: Array<CommentsSchema.Row["id"]>,
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "Comments.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveRow["tenantId"],
            excludeIds: Array<CommentsSchema.ActiveRow["id"]>,
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerPlacedOrderFastForward = Effect.fn(
          "Comments.Repository.findActiveCustomerPlacedOrderFastForward",
        )(
          (
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: CommentsSchema.ActiveCustomerPlacedOrderRow["tenantId"],
            excludeIds: Array<
              CommentsSchema.ActiveCustomerPlacedOrderRow["id"]
            >,
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
                        `${getViewName(CommentsSchema.activeCustomerPlacedOrderView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            CommentsSchema.activeCustomerPlacedOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                CommentsSchema.activeCustomerPlacedOrderView.id,
                              ),
                              notInArray(
                                CommentsSchema.activeCustomerPlacedOrderView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .customerId,
                                customerId,
                              ),
                              eq(
                                CommentsSchema.activeCustomerPlacedOrderView
                                  .tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(
                        Struct.omit(
                          cte[
                            getViewName(
                              CommentsSchema.activeCustomerPlacedOrderView,
                            )
                          ],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountOrderFastForward =
          Effect.fn(
            "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderFastForward",
          )(
            (
              managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
              clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
              clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
              tenantId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["tenantId"],
              excludeIds: Array<
                CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["id"]
              >,
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
                          `${getViewName(activeManagedSharedAccountOrderView)}_fast_forward`,
                        )
                        .as(
                          qb
                            .innerJoin(
                              activeManagedSharedAccountOrderView,
                              and(
                                eq(
                                  metadataTable.entityId,
                                  activeManagedSharedAccountOrderView.id,
                                ),
                                notInArray(
                                  activeManagedSharedAccountOrderView.id,
                                  excludeIds,
                                ),
                              ),
                            )
                            .where(
                              and(
                                eq(
                                  activeManagedSharedAccountOrderView.authorizedManagerId,
                                  managerId,
                                ),
                                eq(
                                  activeManagedSharedAccountOrderView.tenantId,
                                  tenantId,
                                ),
                              ),
                            ),
                        );

                      return tx
                        .with(cte)
                        .selectDistinctOn(
                          [
                            cte[
                              getViewName(activeManagedSharedAccountOrderView)
                            ].id,
                            cte[
                              getViewName(activeManagedSharedAccountOrderView)
                            ].tenantId,
                          ],
                          Struct.omit(
                            cte[
                              getViewName(activeManagedSharedAccountOrderView)
                            ],
                            "authorizedManagerId",
                          ),
                        )
                        .from(cte);
                    }),
                  ),
                ),
          );

        const findById = Effect.fn("Comments.Repository.findById")(
          (
            id: CommentsSchema.Row["id"],
            tenantId: CommentsSchema.Row["tenantId"],
          ) =>
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
            id: CommentsSchema.Row["id"],
            comment: Partial<Omit<CommentsSchema.Row, "id" | "tenantId">>,
            tenantId: CommentsSchema.Row["tenantId"],
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

        const updateByOrderId = Effect.fn(
          "Comments.Repository.updateByOrderId",
        )(
          (
            orderId: CommentsSchema.Row["orderId"],
            comment: Partial<
              Omit<CommentsSchema.Row, "id" | "orderId" | "tenantId">
            >,
            tenantId: CommentsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(comment)
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
          findActiveCustomerPlacedOrderCreates,
          findActiveManagerAuthorizedSharedAccountOrderCreates,
          findUpdates,
          findActiveUpdates,
          findActiveCustomerPlacedOrderUpdates,
          findActiveManagerAuthorizedSharedAccountOrderUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveCustomerPlacedOrderDeletes,
          findActiveManagerAuthorizedSharedAccountOrderDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveCustomerPlacedOrderFastForward,
          findActiveManagerAuthorizedSharedAccountOrderFastForward,
          findById,
          updateById,
          updateByOrderId,
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
          {
            make: Effect.fn("Comments.Policies.isAuthor.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("authorId")),
                    Effect.map(Equal.equals(principal.userId)),
                  ),
              ),
            ),
          },
        );

        const canEdit = DataAccessContract.makePolicy(
          CommentsContract.canEdit,
          {
            make: Effect.fn("Comments.Policies.canEdit.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
            ),
          },
        );

        const canDelete = DataAccessContract.makePolicy(
          CommentsContract.canDelete,
          { make: Effect.fn("Comments.Policies.canDelete.make")(canEdit.make) },
        );

        const canRestore = DataAccessContract.makePolicy(
          CommentsContract.canRestore,
          {
            make: Effect.fn("Comments.Policies.canRestore.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
            ),
          },
        );

        return { isAuthor, canEdit, canDelete, canRestore } as const;
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
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const orderPolicies = yield* Orders.Policies;
        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (comment: CommentsContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "comments:read" }),
              PullPermission.make({ permission: "active_comments:read" }),
              Events.makeReplicachePullPolicy(
                OrdersContract.isCustomerOrManager.make({
                  id: comment.orderId,
                }),
              ),
              Events.makeReplicachePullPolicy(
                OrdersContract.isManagerAuthorized.make({
                  id: comment.orderId,
                }),
              ),
            ),
          );
        const notifyEdit = notifyCreate;
        const notifyDelete = notifyCreate;
        const notifyRestore = notifyCreate;

        const create = DataAccessContract.makeMutation(
          CommentsContract.create,
          {
            makePolicy: Effect.fn("Comments.Mutations.create.makePolicy")(
              ({ orderId }) =>
                AccessControl.some(
                  AccessControl.permission("comments:create"),
                  orderPolicies.isCustomerOrManager.make({ id: orderId }),
                  orderPolicies.isManagerAuthorized.make({ id: orderId }),
                ),
            ),
            mutator: Effect.fn("Comments.Mutations.create.mutator")(
              (comment, session) =>
                repository
                  .create({
                    ...comment,
                    authorId: session.userId,
                    tenantId: session.tenantId,
                  })
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyCreate),
                  ),
            ),
          },
        );

        const edit = DataAccessContract.makeMutation(CommentsContract.edit, {
          makePolicy: Effect.fn("Comments.Mutations.edit.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("comments:update"),
                  policies.isAuthor.make({ id }),
                ),
                policies.canEdit.make({ id }),
              ),
          ),
          mutator: Effect.fn("Comments.Mutations.edit.mutator")(
            ({ id, ...comment }, session) =>
              repository
                .updateById(id, comment, session.tenantId)
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyEdit),
                ),
          ),
        });

        const delete_ = DataAccessContract.makeMutation(
          CommentsContract.delete_,
          {
            makePolicy: Effect.fn("Comments.Mutations.delete.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.some(
                    AccessControl.permission("comments:delete"),
                    policies.isAuthor.make({ id }),
                  ),
                  policies.canDelete.make({ id }),
                ),
            ),
            mutator: Effect.fn("Comments.Mutations.delete.mutator")(
              ({ id, deletedAt }, session) =>
                repository
                  .updateById(id, { deletedAt }, session.tenantId)
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyDelete),
                  ),
            ),
          },
        );

        const restore = DataAccessContract.makeMutation(
          CommentsContract.restore,
          {
            makePolicy: Effect.fn("Comments.Mutations.restore.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("comments:delete"),
                  policies.canRestore.make({ id }),
                ),
            ),
            mutator: Effect.fn("Comments.Mutations.restore.mutator")(
              ({ id }, session) =>
                repository
                  .updateById(id, { deletedAt: null }, session.tenantId)
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyRestore),
                  ),
            ),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
