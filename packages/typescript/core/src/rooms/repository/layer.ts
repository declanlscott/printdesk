import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import { activePublishedRoomsView, activeRoomsView, rooms } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type { Room, RoomsTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = rooms.table;
  const activeView = activeRoomsView;
  const activePublishedView = activePublishedRoomsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("Rooms.Repository.create")((value: InferInsertModel<RoomsTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findCreates = Effect.fn("Rooms.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(rooms.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${rooms.name}_creates`)
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

  const findActiveCreates = Effect.fn("Rooms.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(rooms.name, clientView).pipe(
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

  const findActivePublishedCreates = Effect.fn("Rooms.Repository.findActivePublishedCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(rooms.name, clientView).pipe(
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

  const findUpdates = Effect.fn("Rooms.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(rooms.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${rooms.name}_updates`)
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

            return tx.with(cte).select(cte[rooms.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Rooms.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(rooms.name, clientView).pipe(
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

  const findActivePublishedUpdates = Effect.fn("Rooms.Repository.findActivePublishedUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(rooms.name, clientView).pipe(
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

  const findDeletes = Effect.fn("Rooms.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(rooms.name, clientView)
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

  const findActiveDeletes = Effect.fn("Rooms.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(rooms.name, clientView)
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

  const findActivePublishedDeletes = Effect.fn("Rooms.Repository.findActivePublishedDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(rooms.name, clientView)
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

  const findFastForward = Effect.fn("Rooms.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Room["id"]>) =>
      entriesQueryBuilder.fastForward(rooms.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${rooms.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[rooms.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Rooms.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Room["id"]>) =>
      entriesQueryBuilder.fastForward(rooms.name, clientView).pipe(
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
    "Rooms.Repository.findActivePublishedFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<Room["id"]>) =>
    entriesQueryBuilder.fastForward(rooms.name, clientView).pipe(
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

  const findById = Effect.fn("Rooms.Repository.findById")(
    (id: Room["id"], tenantId: Room["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Rooms.Repository.updateById")(
    (id: Room["id"], room: Partial<Omit<Room, "id" | "tenantId">>, tenantId: Room["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(room)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
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
    updateById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomsRepository));
