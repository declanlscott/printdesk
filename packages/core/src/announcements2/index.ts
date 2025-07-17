import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept } from "../utils/types";

export namespace Announcements {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/announcements/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.announcementsTable.table;

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

        const update = Effect.fn("Announcements.Repository.update")(
          (
            announcement: PartialExcept<schema.Announcement, "id" | "tenantId">,
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(announcement)
                  .where(
                    and(
                      eq(table.id, announcement.id),
                      eq(table.tenantId, announcement.tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const delete_ = Effect.fn("Announcements.Repository.delete")(
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

        return {
          create,
          findByIds,
          update,
          delete: delete_,
        };
      }),
    },
  ) {}
}
