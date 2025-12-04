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
import { Database } from "../database2";
import { Events } from "../events2";
import { MutationsContract } from "../mutations/contract";
import { Orders } from "../orders2";
import { OrdersContract } from "../orders2/contract";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache2/schemas";
import { CommentsContract } from "./contract";
import { CommentsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache2/schemas";

export namespace Comments {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/comments/Repository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = CommentsSchema.table.definition;
        const activeView = CommentsSchema.activeView;
        const activeCustomerPlacedOrderView =
          CommentsSchema.activeCustomerPlacedOrderView;
        const activeManagedSharedAccountOrderView =
          CommentsSchema.activeManagerAuthorizedSharedAccountOrderView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_creates`)
                    .as(
                      tx
                        .select()
                        .from(table)
                        .where(eq(table.tenantId, clientView.tenantId)),
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
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerPlacedOrderView)}_creates`,
                    )
                    .as(
                      tx
                        .select(
                          Struct.omit(
                            getViewSelectedFields(
                              activeCustomerPlacedOrderView,
                            ),
                            "customerId",
                          ),
                        )
                        .from(activeCustomerPlacedOrderView)
                        .where(
                          and(
                            eq(
                              activeCustomerPlacedOrderView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerPlacedOrderView.tenantId,
                              clientView.tenantId,
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
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
                              clientView.tenantId,
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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_updates`)
                    .as(
                      qb
                        .innerJoin(
                          table,
                          and(
                            eq(entriesTable.entityId, table.id),
                            not(eq(entriesTable.entityVersion, table.version)),
                            eq(entriesTable.tenantId, table.tenantId),
                          ),
                        )
                        .where(eq(table.tenantId, clientView.tenantId)),
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
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_updates`)
                  .as(
                    qb
                      .innerJoin(
                        activeView,
                        and(
                          eq(entriesTable.entityId, activeView.id),
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerPlacedOrderView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeCustomerPlacedOrderView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeCustomerPlacedOrderView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeCustomerPlacedOrderView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeCustomerPlacedOrderView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerPlacedOrderView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerPlacedOrderView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .select(
                      Struct.omit(
                        cte[getViewName(activeCustomerPlacedOrderView)],
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                              entriesTable.entityId,
                              activeManagedSharedAccountOrderView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeManagedSharedAccountOrderView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
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
                              clientView.tenantId,
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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder
              .deletes(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, clientView.tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "Comments.Repository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
            .pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeView.id })
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  ),
                ),
              ),
            ),
        );

        const findActiveCustomerPlacedOrderDeletes = Effect.fn(
          "Comments.Repository.findActiveCustomerPlacedOrderDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({
                        id: activeCustomerPlacedOrderView.id,
                      })
                      .from(activeCustomerPlacedOrderView)
                      .where(
                        and(
                          eq(
                            activeCustomerPlacedOrderView.customerId,
                            customerId,
                          ),
                          eq(
                            activeCustomerPlacedOrderView.tenantId,
                            clientView.tenantId,
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
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
                            clientView.tenantId,
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
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CommentsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, clientView.tenantId)),
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
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<CommentsSchema.ActiveRow["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, clientView.tenantId)),
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
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              CommentsSchema.ActiveCustomerPlacedOrderRow["id"]
            >,
            customerId: CommentsSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeCustomerPlacedOrderView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerPlacedOrderView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeCustomerPlacedOrderView.id,
                              ),
                              notInArray(
                                activeCustomerPlacedOrderView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedOrderView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerPlacedOrderView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(
                        Struct.omit(
                          cte[getViewName(activeCustomerPlacedOrderView)],
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
              clientView: ReplicacheClientViewsSchema.Row,
              excludeIds: Array<
                CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["id"]
              >,
              managerId: CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderRow["authorizedManagerId"],
            ) =>
              entriesQueryBuilder
                .fastForward(getTableName(table), clientView)
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
                                  entriesTable.entityId,
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
                                  clientView.tenantId,
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

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/comments/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(CommentsSchema.table.definition),
          )
            .query(AccessControl.permission("comments:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_comments:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission(
                "active_customer_placed_order_comments:read",
              ),
              {
                findCreates: repository.findActiveCustomerPlacedOrderCreates,
                findUpdates: repository.findActiveCustomerPlacedOrderUpdates,
                findDeletes: repository.findActiveCustomerPlacedOrderDeletes,
                fastForward:
                  repository.findActiveCustomerPlacedOrderFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_manager_authorized_shared_account_order_comments:read",
              ),
              {
                findCreates:
                  repository.findActiveManagerAuthorizedSharedAccountOrderCreates,
                findUpdates:
                  repository.findActiveManagerAuthorizedSharedAccountOrderUpdates,
                findDeletes:
                  repository.findActiveManagerAuthorizedSharedAccountOrderDeletes,
                fastForward:
                  repository.findActiveManagerAuthorizedSharedAccountOrderFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
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

        const isAuthor = PoliciesContract.makePolicy(
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

        const canEdit = PoliciesContract.makePolicy(CommentsContract.canEdit, {
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
        });

        const canDelete = PoliciesContract.makePolicy(
          CommentsContract.canDelete,
          { make: Effect.fn("Comments.Policies.canDelete.make")(canEdit.make) },
        );

        const canRestore = PoliciesContract.makePolicy(
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

        const create = MutationsContract.makeMutation(CommentsContract.create, {
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
                .pipe(Effect.tap(notifyCreate)),
          ),
        });

        const edit = MutationsContract.makeMutation(CommentsContract.edit, {
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
                .pipe(Effect.tap(notifyEdit)),
          ),
        });

        const delete_ = MutationsContract.makeMutation(
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
                  .pipe(Effect.tap(notifyDelete)),
            ),
          },
        );

        const restore = MutationsContract.makeMutation(
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
                  .pipe(Effect.tap(notifyRestore)),
            ),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
