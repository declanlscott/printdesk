import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ProductsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import { activeProductsView, activePublishedProductsView, products } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type { ActiveProduct, ActivePublishedProduct, Product, ProductsTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = products.table;
  const activeView = activeProductsView;
  const activePublishedView = activePublishedProductsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("Products.Repository.create")((value: InferInsertModel<ProductsTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findCreates = Effect.fn("Products.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(products.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${products.name}_creates`)
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

  const findActiveCreates = Effect.fn("Products.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(products.name, clientView).pipe(
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

  const findActivePublishedCreates = Effect.fn("Products.Repository.findActivePublishedCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(products.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activePublishedView)}_creates`)
              .as(
                tx
                  .select()
                  .from(activePublishedView)
                  .where(eq(activePublishedView.tenantId, clientView.tenantId)),
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

  const findUpdates = Effect.fn("Products.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(products.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${products.name}_updates`)
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

            return tx.with(cte).select(cte[products.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Products.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(products.name, clientView).pipe(
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

  const findActivePublishedUpdates = Effect.fn("Products.Repository.findActivePublishedUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(products.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activePublishedView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activePublishedView,
                    and(
                      eq(entriesTable.entityId, activePublishedView.id),
                      not(eq(entriesTable.entityVersion, activePublishedView.version)),
                      eq(entriesTable.tenantId, activePublishedView.tenantId),
                    ),
                  )
                  .where(eq(activePublishedView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activePublishedView)]).from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("Products.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(products.name, clientView)
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

  const findActiveDeletes = Effect.fn("Products.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(products.name, clientView)
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

  const findActivePublishedDeletes = Effect.fn("Products.Repository.findActivePublishedDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(products.name, clientView)
        .pipe(
          Effect.flatMap((qb) =>
            db.useTransaction((tx) =>
              qb.except(
                tx
                  .select({ id: activePublishedView.id })
                  .from(activePublishedView)
                  .where(eq(activePublishedView.tenantId, clientView.tenantId)),
              ),
            ),
          ),
        ),
  );

  const findFastForward = Effect.fn("Products.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Product["id"]>) =>
      entriesQueryBuilder.fastForward(products.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${products.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[products.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Products.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveProduct["id"]>) =>
      entriesQueryBuilder.fastForward(products.name, clientView).pipe(
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

  const findActivePublishedFastForward = Effect.fn(
    "Products.Repository.findActivePublishedFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActivePublishedProduct["id"]>) =>
    entriesQueryBuilder.fastForward(products.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedView)}_fast_forward`)
            .as(
              qb
                .innerJoin(
                  activePublishedView,
                  and(
                    eq(entriesTable.entityId, activePublishedView.id),
                    notInArray(activePublishedView.id, excludeIds),
                  ),
                )
                .where(eq(activePublishedView.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[getViewName(activePublishedView)]).from(cte);
        }),
      ),
    ),
  );

  const findById = Effect.fn("Products.Repository.findById")(
    (id: Product["id"], tenantId: Product["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findByIdForUpdate = Effect.fn("Products.Repository.findByIdForUpdate")(
    (id: Product["id"], tenantId: Product["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .for("update"),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Products.Repository.updateById")(
    (
      id: Product["id"],
      product: Partial<Omit<Product, "id" | "tenantId">>,
      tenantId: Product["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(product)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateByRoomId = Effect.fn("Products.Repository.updateByRoomId")(
    (
      roomId: Product["roomId"],
      product: Partial<Omit<Product, "id" | "roomId" | "tenantId">>,
      tenantId: Product["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .update(table)
          .set(product)
          .where(and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)))
          .returning(),
      ),
  );

  return {
    create,
    findCreates,
    findActiveCreates,
    findActivePublishedCreates,
    findUpdates,
    findActiveUpdates,
    findActivePublishedUpdates,
    findDeletes,
    findActiveDeletes,
    findActivePublishedDeletes,
    findFastForward,
    findActiveFastForward,
    findActivePublishedFastForward,
    findById,
    findByIdForUpdate,
    updateById,
    updateByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsRepository));
