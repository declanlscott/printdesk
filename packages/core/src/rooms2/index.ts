import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept } from "../utils/types";

export namespace Rooms {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/rooms/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.roomsTable.table;

        const create = Effect.fn("Rooms.Repository.create")(
          (room: InferInsertModel<schema.RoomsTable>) =>
            db
              .useTransaction((tx) => tx.insert(table).values(room).returning())
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findByIds = Effect.fn("Rooms.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Room["id"]>,
            tenantId: schema.Room["tenantId"],
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

        const update = Effect.fn("Rooms.Repository.update")(
          (room: PartialExcept<schema.Room, "id" | "tenantId">) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(room)
                  .where(
                    and(
                      eq(table.id, room.id),
                      eq(table.tenantId, room.tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const delete_ = Effect.fn("Rooms.Repository.delete")(
          (
            id: schema.Room["id"],
            deletedAt: schema.Room["deletedAt"],
            tenantId: schema.Room["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              Promise.all([
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
                // Set all products in the room to draft
                tx
                  .update(schema.productsTable.table)
                  .set({ status: "draft" })
                  .where(
                    and(
                      eq(schema.productsTable.table.roomId, id),
                      eq(schema.productsTable.table.tenantId, tenantId),
                    ),
                  ),
              ]),
            ),
        );

        return { create, findByIds, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
