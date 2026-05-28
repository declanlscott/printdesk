import { and, eq, getViewName, getViewSelectedFields, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { CommentsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import {
  activeCommentsView,
  activeCustomerPlacedOrderCommentsView,
  activeManagerAuthorizedSharedAccountOrderCommentsView,
  comments,
} from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type {
  ActiveComment,
  ActiveCustomerPlacedOrderComment,
  ActiveManagerAuthorizedSharedAccountOrderComment,
  Comment,
  CommentsTable,
} from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = comments.table;
  const activeView = activeCommentsView;
  const activeCustomerPlacedOrderView = activeCustomerPlacedOrderCommentsView;
  const activeManagedSharedAccountOrderView = activeManagerAuthorizedSharedAccountOrderCommentsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("Comments.Repository.create")((value: InferInsertModel<CommentsTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findCreates = Effect.fn("Comments.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${comments.name}_creates`)
              .as(tx.select().from(table).where(eq(table.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveCreates = Effect.fn("Comments.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_creates`)
              .as(tx.select().from(activeView).where(eq(activeView.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveCustomerPlacedOrderCreates = Effect.fn(
    "Comments.Repository.findActiveCustomerPlacedOrderCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderComment["customerId"],
    ) =>
      entriesQueryBuilder.creates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx.$with(`${getViewName(activeCustomerPlacedOrderView)}_creates`).as(
              tx
                .select(
                  Struct.omit(getViewSelectedFields(activeCustomerPlacedOrderView), ["customerId"]),
                )
                .from(activeCustomerPlacedOrderView)
                .where(
                  and(
                    eq(activeCustomerPlacedOrderView.customerId, customerId),
                    eq(activeCustomerPlacedOrderView.tenantId, clientView.tenantId),
                  ),
                ),
            );

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountOrderCreates = Effect.fn(
    "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderComment["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.creates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx.$with(`${getViewName(activeManagedSharedAccountOrderView)}_creates`).as(
              tx
                .selectDistinctOn(
                  [
                    activeManagedSharedAccountOrderView.id,
                    activeManagedSharedAccountOrderView.tenantId,
                  ],
                  Struct.omit(getViewSelectedFields(activeManagedSharedAccountOrderView), [
                    "authorizedManagerId",
                  ]),
                )
                .from(activeManagedSharedAccountOrderView)
                .where(
                  and(
                    eq(activeManagedSharedAccountOrderView.authorizedManagerId, managerId),
                    eq(activeManagedSharedAccountOrderView.tenantId, clientView.tenantId),
                  ),
                ),
            );

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findUpdates = Effect.fn("Comments.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${comments.name}_updates`)
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

            return tx.with(cte).select(cte[comments.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Comments.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(comments.name, clientView).pipe(
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
                      not(eq(entriesTable.entityVersion, activeView.version)),
                      eq(entriesTable.tenantId, activeView.tenantId),
                    ),
                  )
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveCustomerPlacedOrderUpdates = Effect.fn(
    "Comments.Repository.findActiveCustomerPlacedOrderUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderComment["customerId"],
    ) =>
      entriesQueryBuilder.updates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerPlacedOrderView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerPlacedOrderView,
                    and(
                      eq(entriesTable.entityId, activeCustomerPlacedOrderView.id),
                      not(eq(entriesTable.entityVersion, activeCustomerPlacedOrderView.version)),
                      eq(entriesTable.tenantId, activeCustomerPlacedOrderView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerPlacedOrderView.customerId, customerId),
                      eq(activeCustomerPlacedOrderView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .select(Struct.omit(cte[getViewName(activeCustomerPlacedOrderView)], ["customerId"]))
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountOrderUpdates = Effect.fn(
    "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderComment["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.updates(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagedSharedAccountOrderView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeManagedSharedAccountOrderView,
                    and(
                      eq(entriesTable.entityId, activeManagedSharedAccountOrderView.id),
                      not(
                        eq(entriesTable.entityVersion, activeManagedSharedAccountOrderView.version),
                      ),
                      eq(entriesTable.tenantId, activeManagedSharedAccountOrderView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagedSharedAccountOrderView.authorizedManagerId, managerId),
                      eq(activeManagedSharedAccountOrderView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagedSharedAccountOrderView)].id,
                  cte[getViewName(activeManagedSharedAccountOrderView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagedSharedAccountOrderView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("Comments.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(comments.name, clientView)
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

  const findActiveDeletes = Effect.fn("Comments.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(comments.name, clientView)
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
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderComment["customerId"],
    ) =>
      entriesQueryBuilder.deletes(comments.name, clientView).pipe(
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
                    eq(activeCustomerPlacedOrderView.customerId, customerId),
                    eq(activeCustomerPlacedOrderView.tenantId, clientView.tenantId),
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
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderComment["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.deletes(comments.name, clientView).pipe(
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
                    eq(activeManagedSharedAccountOrderView.authorizedManagerId, managerId),
                    eq(activeManagedSharedAccountOrderView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("Comments.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Comment["id"]>) =>
      entriesQueryBuilder.fastForward(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${comments.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[comments.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Comments.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveComment["id"]>) =>
      entriesQueryBuilder.fastForward(comments.name, clientView).pipe(
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

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveCustomerPlacedOrderFastForward = Effect.fn(
    "Comments.Repository.findActiveCustomerPlacedOrderFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerPlacedOrderComment["id"]>,
      customerId: ActiveCustomerPlacedOrderComment["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerPlacedOrderView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerPlacedOrderView,
                    and(
                      eq(entriesTable.entityId, activeCustomerPlacedOrderView.id),
                      notInArray(activeCustomerPlacedOrderView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerPlacedOrderView.customerId, customerId),
                      eq(activeCustomerPlacedOrderView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .select(Struct.omit(cte[getViewName(activeCustomerPlacedOrderView)], ["customerId"]))
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountOrderFastForward = Effect.fn(
    "Comments.Repository.findActiveManagerAuthorizedSharedAccountOrderFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountOrderComment["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountOrderComment["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.fastForward(comments.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagedSharedAccountOrderView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagedSharedAccountOrderView,
                    and(
                      eq(entriesTable.entityId, activeManagedSharedAccountOrderView.id),
                      notInArray(activeManagedSharedAccountOrderView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagedSharedAccountOrderView.authorizedManagerId, managerId),
                      eq(activeManagedSharedAccountOrderView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagedSharedAccountOrderView)].id,
                  cte[getViewName(activeManagedSharedAccountOrderView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagedSharedAccountOrderView)], [
                  "authorizedManagerId",
                ]),
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
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
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
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateByOrderId = Effect.fn("Comments.Repository.updateByOrderId")(
    (
      orderId: Comment["orderId"],
      comment: Partial<Omit<Comment, "id" | "orderId" | "tenantId">>,
      tenantId: Comment["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(comment)
            .where(and(eq(table.orderId, orderId), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
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
});

export const layer = makeService.pipe(Layer.effect(CommentsRepository));
