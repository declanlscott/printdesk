// oxlint-disable typescript/no-unsafe-type-assertion
import {
  and,
  eq,
  getTableColumns,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Struct from "effect/Struct";

import { OrderObjectMetadataRepository, OrderObjectMetadataSyncRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import { OrdersContract } from "../../contracts";
import {
  activeCustomerPlacedOrderObjectMetadataView,
  activeManagerAuthorizedSharedAccountOrderObjectMetadataView,
  activeOrderObjectMetadataView,
  activeOrdersView,
  orderObjectMetadata,
  ordersTable,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  OrderObjectMetadataTable,
  OrderObjectMetadata,
  ActiveManagerAuthorizedSharedAccountOrderObjectMetadata,
  ActiveCustomerPlacedOrderObjectMetadata,
  ActiveOrderObjectMetadata,
} from "../../sql";

export type Repository = Effect.Success<typeof makeRepository>;
export const makeRepository = Effect.gen(function* () {
  const db = yield* Database;

  const table = orderObjectMetadata.table;

  const create = Effect.fn("OrderObjectMetadata.Repository.create")(
    (value: InferInsertModel<OrderObjectMetadataTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(value).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findById = Effect.fn("OrderObjectMetadata.Repository.findById")(
    (id: OrderObjectMetadata["id"], tenantId: OrderObjectMetadata["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findWithOrderById = Effect.fn("OrderObjectMetadata.Repository.findWithOrderById")(
    (id: OrderObjectMetadata["id"], tenantId: OrderObjectMetadata["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              order: getTableColumns(ordersTable),
              metadata: getTableColumns(table),
            })
            .from(table)
            .innerJoin(
              ordersTable,
              and(eq(table.orderId, ordersTable.id), eq(table.tenantId, ordersTable.tenantId)),
            )
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findByOrderId = Effect.fn("OrderObjectMetadata.Repository.findByOrderId")(
    (orderId: OrderObjectMetadata["orderId"], tenantId: OrderObjectMetadata["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select({ metadata: getTableColumns(table) })
            .from(table)
            .rightJoin(
              ordersTable,
              and(eq(table.orderId, ordersTable.id), eq(table.tenantId, ordersTable.tenantId)),
            )
            .where(
              and(
                eq(ordersTable.id, orderId),
                eq(ordersTable.tenantId, tenantId),
                eq(table.orderId, orderId),
                eq(table.tenantId, tenantId),
              ),
            ),
        )
        .pipe(
          Effect.filterOrFail(Array.isArrayNonEmpty),
          Effect.flatMap(
            Effect.filterMap(({ metadata }) =>
              metadata ? Result.succeed(metadata) : Result.failVoid,
            ),
          ),
        ),
  );

  const findByOrderIdWithOrder = Effect.fn("OrderObjectMetadata.Repository.findByOrderIdWithOrder")(
    (orderId: OrderObjectMetadata["orderId"], tenantId: OrderObjectMetadata["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              order: getTableColumns(ordersTable),
              metadata: getTableColumns(table),
            })
            .from(table)
            .rightJoin(
              ordersTable,
              and(eq(table.orderId, ordersTable.id), eq(table.tenantId, ordersTable.tenantId)),
            )
            .where(
              and(
                eq(ordersTable.id, orderId),
                eq(ordersTable.tenantId, tenantId),
                eq(table.orderId, orderId),
                eq(table.tenantId, tenantId),
              ),
            ),
        )
        .pipe(
          Effect.filterOrFail(Array.isArrayNonEmpty),
          Effect.flatMap(
            Effect.filterMap(({ order, metadata }) =>
              metadata ? Result.succeed({ order, metadata }) : Result.failVoid,
            ),
          ),
        ),
  );

  const updateById = Effect.fn("OrderObjectMetadata.Repository.updateById")(
    (
      id: OrderObjectMetadata["id"],
      object: Partial<Omit<OrderObjectMetadata, "id" | "tenantId">>,
      tenantId: OrderObjectMetadata["tenantId"],
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
    findWithOrderById,
    findByOrderId,
    findByOrderIdWithOrder,
    updateById,
  } as const;
});
export const repositoryLayer = makeRepository.pipe(Layer.effect(OrderObjectMetadataRepository));

export type SyncRepository = Effect.Success<typeof makeSyncRepository>;
export const makeSyncRepository = Effect.gen(function* () {
  const db = yield* Database;

  const table = orderObjectMetadata.table;
  const activeView = activeOrderObjectMetadataView;
  const activeCustomerPlacedView = activeCustomerPlacedOrderObjectMetadataView;
  const activeManagerAuthorizedSharedAccountView =
    activeManagerAuthorizedSharedAccountOrderObjectMetadataView;

  const activeCustomerPlacedOrdersView = activeOrdersView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const findCreates = Effect.fn("OrderObjectMetadata.SyncRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(orderObjectMetadata.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orderObjectMetadata.name}_creates`)
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

  const findActiveCreates = Effect.fn("OrderObjectMetadata.SyncRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveCustomerPlacedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderObjectMetadata["customerId"],
    ) =>
      entriesQueryBuilder.creates(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveManagerAuthorizedSharedAccountCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObjectMetadata["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.creates(orderObjectMetadata.name, clientView).pipe(
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

  const findUpdates = Effect.fn("OrderObjectMetadata.SyncRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(orderObjectMetadata.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orderObjectMetadata.name}_updates`)
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

            return tx.with(cte).select(cte[orderObjectMetadata.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("OrderObjectMetadata.SyncRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveCustomerPlacedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderObjectMetadata["customerId"],
    ) =>
      entriesQueryBuilder.updates(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveManagerAuthorizedSharedAccountUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObjectMetadata["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.updates(orderObjectMetadata.name, clientView).pipe(
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

  const findDeletes = Effect.fn("OrderObjectMetadata.SyncRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(orderObjectMetadata.name, clientView)
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

  const findActiveDeletes = Effect.fn("OrderObjectMetadata.SyncRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(orderObjectMetadata.name, clientView)
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
    "OrderObjectMetadata.SyncRepository.findActiveCustomerPlacedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderObjectMetadata["customerId"],
    ) =>
      entriesQueryBuilder.deletes(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveManagerAuthorizedSharedAccountDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObjectMetadata["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.deletes(orderObjectMetadata.name, clientView).pipe(
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

  const findFastForward = Effect.fn("OrderObjectMetadata.SyncRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<OrderObjectMetadata["id"]>) =>
      entriesQueryBuilder.fastForward(orderObjectMetadata.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orderObjectMetadata.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[orderObjectMetadata.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn(
    "OrderObjectMetadata.SyncRepository.findActiveFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActiveOrderObjectMetadata["id"]>) =>
    entriesQueryBuilder.fastForward(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveCustomerPlacedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerPlacedOrderObjectMetadata["id"]>,
      customerId: ActiveCustomerPlacedOrderObjectMetadata["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(orderObjectMetadata.name, clientView).pipe(
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
    "OrderObjectMetadata.SyncRepository.findActiveManagerAuthorizedSharedAccountFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountOrderObjectMetadata["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountOrderObjectMetadata["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.fastForward(orderObjectMetadata.name, clientView).pipe(
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
  Layer.effect(OrderObjectMetadataSyncRepository),
);

export const layer = Layer.merge(repositoryLayer, syncRepositoryLayer);
