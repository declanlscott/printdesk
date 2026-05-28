import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { RoomWorkflowsRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntriesTable } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import {
  activePublishedRoomRoomWorkflowsView,
  activeRoomWorkflowsView,
  roomWorkflows,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActivePublishedRoomRoomWorkflow,
  ActiveRoomWorkflow,
  RoomWorkflow,
  RoomWorkflowsTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = roomWorkflows.table;
  const activeView = activeRoomWorkflowsView;
  const activePublishedRoomView = activePublishedRoomRoomWorkflowsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntriesTable;

  const create = Effect.fn("RoomWorkflows.Repository.create")(
    (roomWorkflow: InferInsertModel<RoomWorkflowsTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(roomWorkflow).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findCreates = Effect.fn("RoomWorkflows.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(roomWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${roomWorkflows.name}_creates`)
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

  const findActiveCreates = Effect.fn("RoomWorkflows.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(roomWorkflows.name, clientView).pipe(
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

  const findActivePublishedRoomCreates = Effect.fn(
    "RoomWorkflows.Repository.findActivePublishedRoomCreates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.creates(roomWorkflows.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_creates`)
            .as(
              tx
                .select()
                .from(activePublishedRoomView)
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
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

  const findUpdates = Effect.fn("RoomWorkflows.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(roomWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${roomWorkflows.name}_updates`)
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

            return tx.with(cte).select(cte[roomWorkflows.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("RoomWorkflows.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(roomWorkflows.name, clientView).pipe(
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

  const findActivePublishedRoomUpdates = Effect.fn(
    "RoomWorkflows.Repository.findActivePublishedRoomUpdates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.updates(roomWorkflows.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_updates`)
            .as(
              qb
                .innerJoin(
                  activePublishedRoomView,
                  and(
                    eq(entriesTable.entityId, activePublishedRoomView.id),
                    not(eq(entriesTable.entityVersion, activePublishedRoomView.version)),
                    eq(entriesTable.tenantId, activePublishedRoomView.tenantId),
                  ),
                )
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[getViewName(activePublishedRoomView)]).from(cte);
        }),
      ),
    ),
  );

  const findDeletes = Effect.fn("RoomWorkflows.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(roomWorkflows.name, clientView)
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

  const findActiveDeletes = Effect.fn("RoomWorkflows.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(roomWorkflows.name, clientView)
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

  const findActivePublishedRoomDeletes = Effect.fn(
    "RoomWorkflows.Repository.findActivePublishedRoomDeletes",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(roomWorkflows.name, clientView)
      .pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activePublishedRoomView.id })
                .from(activePublishedRoomView)
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("RoomWorkflows.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<RoomWorkflow["id"]>) =>
      entriesQueryBuilder.fastForward(roomWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${roomWorkflows.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[roomWorkflows.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("RoomWorkflows.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveRoomWorkflow["id"]>) =>
      entriesQueryBuilder.fastForward(roomWorkflows.name, clientView).pipe(
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

  const findActivePublishedRoomFastForward = Effect.fn(
    "RoomWorkflows.Repository.findActivePublishedRoomFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActivePublishedRoomRoomWorkflow["id"]>) =>
    entriesQueryBuilder.fastForward(roomWorkflows.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_fast_forward`)
            .as(
              qb
                .innerJoin(
                  activePublishedRoomView,
                  and(
                    eq(entriesTable.entityId, activePublishedRoomView.id),
                    notInArray(activePublishedRoomView.id, excludeIds),
                  ),
                )
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[getViewName(activePublishedRoomView)]).from(cte);
        }),
      ),
    ),
  );

  const findById = Effect.fn("RoomWorkflows.Repository.findById")(
    (id: RoomWorkflow["id"], tenantId: RoomWorkflow["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findActivePublishedById = Effect.fn("RoomsWorkflows.Repository.findActivePublishedById")(
    (
      id: ActivePublishedRoomRoomWorkflow["id"],
      tenantId: ActivePublishedRoomRoomWorkflow["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(activePublishedRoomView)
            .where(
              and(
                eq(activePublishedRoomView.id, id),
                eq(activePublishedRoomView.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateByRoomId = Effect.fn("RoomWorkflows.Repository.updateByRoomId")(
    (
      roomId: RoomWorkflow["roomId"],
      roomWorkflow: Partial<Omit<RoomWorkflow, "id" | "roomID" | "tenantId">>,
      tenantId: RoomWorkflow["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(roomWorkflow)
            .where(and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    create,
    findCreates,
    findActiveCreates,
    findActivePublishedRoomCreates,
    findUpdates,
    findActiveUpdates,
    findActivePublishedRoomUpdates,
    findDeletes,
    findActiveDeletes,
    findActivePublishedRoomDeletes,
    findFastForward,
    findActiveFastForward,
    findActivePublishedRoomFastForward,
    findById,
    findActivePublishedById,
    updateByRoomId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(RoomWorkflowsRepository));
