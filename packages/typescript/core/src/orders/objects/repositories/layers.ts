// oxlint-disable typescript/no-unsafe-type-assertion
import { and, eq, getViewName, getViewSelectedFields, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { OrderObjectsRepository, OrderObjectsSyncRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import { OrdersContract } from "../../contracts";
import {
  activeCustomerPlacedOrderObjectsView,
  activeManagerAuthorizedSharedAccountOrderObjectsView,
  activeOrderObjectsView,
  activeOrdersView,
  orderObjects,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  OrderObjectsTable,
  OrderObject,
  ActiveManagerAuthorizedSharedAccountOrderObject,
  ActiveCustomerPlacedOrderObject,
  ActiveOrderObject,
} from "../../sql";

export type Repository = Effect.Success<typeof makeRepository>;
export const makeRepository = Effect.gen(function* () {
  const db = yield* Database;

  const table = orderObjects.table;

  const create = Effect.fn("OrderObjects.Repository.create")(
    (value: InferInsertModel<OrderObjectsTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(value).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findById = Effect.fn("OrderObjects.Repository.findById")(
    (id: OrderObject["id"], tenantId: OrderObject["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("OrderObjects.Repository.updateById")(
    (
      id: OrderObject["id"],
      object: Partial<Omit<OrderObject, "id" | "tenantId">>,
      tenantId: OrderObject["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(object)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    create,
    findById,
    updateById,
  } as const;
});
export const repositoryLayer = makeRepository.pipe(Layer.effect(OrderObjectsRepository));

export type SyncRepository = Effect.Success<typeof makeSyncRepository>;
export const makeSyncRepository = Effect.gen(function* () {
  const db = yield* Database;

  const table = orderObjects.table;
  const activeView = activeOrderObjectsView;
  const activeCustomerPlacedView = activeCustomerPlacedOrderObjectsView;
  const activeManagerAuthorizedSharedAccountView =
    activeManagerAuthorizedSharedAccountOrderObjectsView;

  const activeCustomerPlacedOrdersView = activeOrdersView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const findCreates = Effect.fn("OrderObjects.SyncRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orderObjects.name}_creates`)
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

  const findActiveCreates = Effect.fn("OrderObjects.SyncRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(orderObjects.name, clientView).pipe(
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

  const findActiveCustomerPlacedCreates = Effect.fn(
    "OrderObjects.SyncRepository.findActiveCustomerPlacedCreates",
  )((clientView: ReplicacheClientView, customerId: ActiveCustomerPlacedOrderObject["customerId"]) =>
    entriesQueryBuilder.creates(orderObjects.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx.$with(`${OrdersContract.ActiveCustomerPlacedView.name}_creates`).as(
            tx
              .select(getViewSelectedFields(activeCustomerPlacedView))
              .from(activeCustomerPlacedView)
              .innerJoin(
                activeCustomerPlacedOrdersView,
                and(
                  eq(activeCustomerPlacedView.orderId, activeCustomerPlacedOrdersView.id),
                  eq(activeCustomerPlacedView.tenantId, activeCustomerPlacedOrdersView.tenantId),
                ),
              )
              .where(
                and(
                  eq(activeCustomerPlacedOrdersView.customerId, customerId),
                  eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
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

  const findActiveManagerAuthorizedSharedAccountCreates = Effect.fn(
    "OrderObjects.SyncRepository.findActiveManagerAuthorizedSharedAccountCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObject["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.creates(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_creates`)
              .as(
                tx
                  .selectDistinctOn(
                    [
                      activeManagerAuthorizedSharedAccountView.id,
                      activeManagerAuthorizedSharedAccountView.tenantId,
                    ],
                    Struct.omit(getViewSelectedFields(activeManagerAuthorizedSharedAccountView), [
                      "authorizedManagerId",
                    ]),
                  )
                  .from(activeManagerAuthorizedSharedAccountView)
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
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

  const findUpdates = Effect.fn("OrderObjects.SyncRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orderObjects.name}_updates`)
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

            return tx.with(cte).select(cte[orderObjects.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("OrderObjects.SyncRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(orderObjects.name, clientView).pipe(
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

  const findActiveCustomerPlacedUpdates = Effect.fn(
    "OrderObjects.SyncRepository.findActiveCustomerPlacedUpdates",
  )((clientView: ReplicacheClientView, customerId: ActiveCustomerPlacedOrderObject["customerId"]) =>
    entriesQueryBuilder.updates(orderObjects.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${OrdersContract.ActiveCustomerPlacedView.name}_updates`)
            .as(
              qb
                .innerJoin(
                  activeCustomerPlacedView,
                  and(
                    eq(entriesTable.entityId, activeCustomerPlacedView.id),
                    not(eq(entriesTable.entityVersion, activeCustomerPlacedView.version)),
                    eq(entriesTable.tenantId, activeCustomerPlacedView.tenantId),
                  ),
                )
                .where(
                  and(
                    eq(activeCustomerPlacedView.customerId, customerId),
                    eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
                  ),
                ),
            );

          return tx.with(cte).select(cte[getViewName(activeCustomerPlacedView)]).from(cte);
        }),
      ),
    ),
  );

  const findActiveManagerAuthorizedSharedAccountUpdates = Effect.fn(
    "OrderObjects.SyncRepository.findActiveManagerAuthorizedSharedAccountUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObject["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.updates(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountView.id),
                      not(
                        eq(
                          entriesTable.entityVersion,
                          activeManagerAuthorizedSharedAccountView.version,
                        ),
                      ),
                      eq(entriesTable.tenantId, activeManagerAuthorizedSharedAccountView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("OrderObjects.SyncRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(orderObjects.name, clientView)
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

  const findActiveDeletes = Effect.fn("OrderObjects.SyncRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(orderObjects.name, clientView)
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

  const findActiveCustomerPlacedDeletes = Effect.fn(
    "OrderObjects.SyncRepository.findActiveCustomerPlacedDeletes",
  )((clientView: ReplicacheClientView, customerId: ActiveCustomerPlacedOrderObject["customerId"]) =>
    entriesQueryBuilder.deletes(orderObjects.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) =>
          qb.except(
            tx
              .select({ id: activeCustomerPlacedView.id })
              .from(activeCustomerPlacedView)
              .where(
                and(
                  eq(activeCustomerPlacedView.customerId, customerId),
                  eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
                ),
              ),
          ),
        ),
      ),
    ),
  );

  const findActiveManagerAuthorizedSharedAccountDeletes = Effect.fn(
    "OrderObjects.SyncRepository.findActiveManagerAuthorizedSharedAccountDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObject["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.deletes(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .selectDistinctOn(
                  [
                    activeManagerAuthorizedSharedAccountView.id,
                    activeManagerAuthorizedSharedAccountView.tenantId,
                  ],
                  { id: activeManagerAuthorizedSharedAccountView.id },
                )
                .from(activeManagerAuthorizedSharedAccountView)
                .where(
                  and(
                    eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                    eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("OrderObjects.SyncRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<OrderObject["id"]>) =>
      entriesQueryBuilder.fastForward(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orderObjects.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[orderObjects.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("OrderObjects.SyncRepository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveOrderObject["id"]>) =>
      entriesQueryBuilder.fastForward(orderObjects.name, clientView).pipe(
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

  const findActiveCustomerPlacedFastForward = Effect.fn(
    "OrderObjects.SyncRepository.findActiveCustomerPlacedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerPlacedOrderObject["id"]>,
      customerId: ActiveCustomerPlacedOrderObject["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${OrdersContract.ActiveCustomerPlacedView.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerPlacedView,
                    and(
                      eq(entriesTable.entityId, activeCustomerPlacedView.id),
                      notInArray(activeCustomerPlacedView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerPlacedView.customerId, customerId),
                      eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeCustomerPlacedView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountFastForward = Effect.fn(
    "OrderObjects.SyncRepository.findActiveManagerAuthorizedSharedAccountFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountOrderObject["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObject["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.fastForward(orderObjects.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountView.id),
                      notInArray(activeManagerAuthorizedSharedAccountView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  return {
    findCreates,
    findActiveCreates,
    findActiveCustomerPlacedCreates,
    findActiveManagerAuthorizedSharedAccountCreates,
    findUpdates,
    findActiveUpdates,
    findActiveCustomerPlacedUpdates,
    findActiveManagerAuthorizedSharedAccountUpdates,
    findDeletes,
    findActiveDeletes,
    findActiveCustomerPlacedDeletes,
    findActiveManagerAuthorizedSharedAccountDeletes,
    findFastForward,
    findActiveFastForward,
    findActiveCustomerPlacedFastForward,
    findActiveManagerAuthorizedSharedAccountFastForward,
  } as const;
});
export const syncRepositoryLayer = makeSyncRepository.pipe(
  Layer.effect(OrderObjectsSyncRepository),
);

export const layer = Layer.merge(repositoryLayer, syncRepositoryLayer);
