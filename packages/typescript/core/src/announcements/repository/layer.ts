import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AnnouncementsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import {
  activeAnnouncementsView,
  activePublishedRoomAnnouncementsView,
  announcements,
  announcementsTable,
} from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type {
  ActiveAnnouncement,
  ActivePublishedRoomAnnouncement,
  Announcement,
  AnnouncementsTable,
} from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = announcementsTable;
  const activeView = activeAnnouncementsView;
  const activePublishedRoomView = activePublishedRoomAnnouncementsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("Announcements.Repository.create")(
    (value: InferInsertModel<AnnouncementsTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(value).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findCreates = Effect.fn("Announcements.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(announcements.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${announcements.name}_creates`)
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

  const findActiveCreates = Effect.fn("Announcements.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(announcements.name, clientView).pipe(
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
    "Announcements.Repository.findActivePublishedRoomCreates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.creates(announcements.name, clientView).pipe(
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

  const findUpdates = Effect.fn("Announcements.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(announcements.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${announcements.name}_updates`)
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

            return tx.with(cte).select(cte[announcements.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Announcements.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(announcements.name, clientView).pipe(
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
    "Announcements.Repository.findActivePublishedRoomUpdates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.updates(announcements.name, clientView).pipe(
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

  const findDeletes = Effect.fn("Announcements.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(announcements.name, clientView)
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

  const findActiveDeletes = Effect.fn("Announcements.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(announcements.name, clientView)
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
    "Announcements.Repository.findActivePublishedRoomDeletes",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(announcements.name, clientView)
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

  const findFastForward = Effect.fn("Announcements.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Announcement["id"]>) =>
      entriesQueryBuilder.fastForward(announcements.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${announcements.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[announcements.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Announcements.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveAnnouncement["id"]>) =>
      entriesQueryBuilder.fastForward(announcements.name, clientView).pipe(
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
    "Announcements.Repository.findActivePublishedRoomFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActivePublishedRoomAnnouncement["id"]>) =>
    entriesQueryBuilder.fastForward(announcements.name, clientView).pipe(
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

  const findById = Effect.fn("Announcements.Repository.findById")(
    (id: Announcement["id"], tenantId: Announcement["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Announcements.Repository.updateById")(
    (
      id: Announcement["id"],
      announcement: Partial<Omit<Announcement, "id" | "tenantId">>,
      tenantId: Announcement["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(announcement)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateByRoomId = Effect.fn("Announcements.Repository.updateByRoomId")(
    (
      roomId: Announcement["roomId"],
      announcement: Partial<Omit<Announcement, "id" | "roomId" | "tenantId">>,
      tenantId: Announcement["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .update(table)
          .set(announcement)
          .where(and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)))
          .returning(),
      ),
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
    updateById,
    updateByRoomId,
  };
});

export const layer = makeService.pipe(Layer.effect(AnnouncementsRepository));
