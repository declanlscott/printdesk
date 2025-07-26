import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { Sync } from "../sync2";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "./shared";
import { activeAnnouncementsView, announcementsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Announcement, AnnouncementsTable } from "./sql";

export namespace Announcements {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/announcements/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = announcementsTable;
        const activeView = activeAnnouncementsView;

        const create = Effect.fn("Announcements.Repository.create")(
          (announcement: InferInsertModel<AnnouncementsTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(announcement).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Announcements.Repository.getMetadata")(
          (tenantId: Announcement["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Announcements.Repository.getActiveMetadata",
        )((tenantId: Announcement["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const findByIds = Effect.fn("Announcements.Repository.findByIds")(
          (
            ids: ReadonlyArray<Announcement["id"]>,
            tenantId: Announcement["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
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
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("Announcements.Repository.deleteById")(
          (
            id: Announcement["id"],
            deletedAt: NonNullable<Announcement["deletedAt"]>,
            tenantId: Announcement["tenantId"],
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

        const deleteByRoomId = Effect.fn(
          "Announcements.Repository.deleteByRoomId",
        )(
          (
            roomId: Announcement["roomId"],
            deletedAt: NonNullable<Announcement["deletedAt"]>,
            tenantId: Announcement["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ deletedAt })
                .where(
                  and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                )
                .returning(),
            ),
        );

        return {
          create,
          getMetadata,
          getActiveMetadata,
          findByIds,
          updateById,
          deleteById,
          deleteByRoomId,
        };
      }),
    },
  ) {}

  export class SyncMutations extends Effect.Service<SyncMutations>()(
    "@printdesk/core/Announcements/SyncMutations",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const create = Sync.Mutation(
          createAnnouncement,
          () => AccessControl.permission("announcements:create"),
          (announcement, session) =>
            repository.create({
              ...announcement,
              authorId: session.userId,
              tenantId: session.tenantId,
            }),
        );

        const update = Sync.Mutation(
          updateAnnouncement,
          () => AccessControl.permission("announcements:update"),
          ({ id, ...data }, session) =>
            repository.updateById(id, data, session.tenantId),
        );

        const delete_ = Sync.Mutation(
          deleteAnnouncement,
          () => AccessControl.permission("announcements:delete"),
          ({ id, deletedAt }, session) =>
            repository.deleteById(id, deletedAt, session.tenantId),
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
