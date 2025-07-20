import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Announcements {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/announcements/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.announcementsTable.table;
        const activeView = schema.activeAnnouncementsView.view;

        const create = Effect.fn("Announcements.Repository.create")(
          (announcement: InferInsertModel<schema.AnnouncementsTable>) =>
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
          (tenantId: schema.Announcement["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Announcements.Repository.getActiveMetadata",
        )((tenantId: schema.Announcement["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const findByIds = Effect.fn("Announcements.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Announcement["id"]>,
            tenantId: schema.Announcement["tenantId"],
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
            id: schema.Announcement["id"],
            announcement: Partial<Omit<schema.Announcement, "id" | "tenantId">>,
            tenantId: schema.Announcement["tenantId"],
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
            id: schema.Announcement["id"],
            deletedAt: NonNullable<schema.Announcement["deletedAt"]>,
            tenantId: schema.Announcement["tenantId"],
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
            roomId: schema.Announcement["roomId"],
            deletedAt: NonNullable<schema.Announcement["deletedAt"]>,
            tenantId: schema.Announcement["tenantId"],
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
}
