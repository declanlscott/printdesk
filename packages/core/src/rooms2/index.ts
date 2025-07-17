import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { Schema } from "effect";
import type { PartialExcept } from "../utils/types";
import type { DeliveryOptions, Workflow } from "./shared";

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

  export class WorkflowRepository extends Effect.Service<WorkflowRepository>()(
    "@printdesk/core/Rooms/WorkflowRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.workflowStatusesTable.table;

        const upsert = Effect.fn("Rooms.WorkflowRepository.upsert")(
          (
            workflow: Schema.Schema.Type<typeof Workflow>,
            roomId: schema.WorkflowStatus["roomId"],
            tenantId: schema.WorkflowStatus["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(
                  workflow.reduce((values, status, index) => {
                    values.push({
                      ...status,
                      index,
                      roomId,
                      tenantId,
                    });

                    return values;
                  }, [] as Array<schema.WorkflowStatus>),
                )
                .onConflictDoUpdate({
                  target: [table.id, table.roomId, table.tenantId],
                  set: buildConflictSet(table),
                })
                .returning()
                .then((workflow) =>
                  tx.delete(table).where(
                    and(
                      notInArray(
                        table.id,
                        workflow.map((status) => status.id),
                      ),
                      gte(table.index, 0),
                      eq(table.roomId, roomId),
                      eq(table.tenantId, tenantId),
                    ),
                  ),
                )
                .then(() => workflow),
            ),
        );

        const findByIds = Effect.fn("Rooms.WorkflowRepository.findByIds")(
          (
            ids: ReadonlyArray<schema.WorkflowStatus["id"]>,
            tenantId: schema.WorkflowStatus["tenantId"],
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

        return { upsert, findByIds } as const;
      }),
    },
  ) {}

  export class DeliveryOptionsRepository extends Effect.Service<DeliveryOptionsRepository>()(
    "@printdesk/core/Rooms/DeliveryOptionsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.deliveryOptionsTable.table;

        const upsert = Effect.fn("Rooms.DeliveryOptionsRepository.upsert")(
          (
            options: Schema.Schema.Type<typeof DeliveryOptions>,
            roomId: schema.DeliveryOption["roomId"],
            tenantId: schema.DeliveryOption["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(
                  options.reduce((values, option, index) => {
                    values.push({
                      ...option,
                      index,
                      roomId,
                      tenantId,
                    });

                    return values;
                  }, [] as Array<schema.DeliveryOption>),
                )
                .onConflictDoUpdate({
                  target: [table.id, table.roomId, table.tenantId],
                  set: buildConflictSet(table),
                })
                .returning()
                .then((options) =>
                  tx.delete(table).where(
                    and(
                      notInArray(
                        table.id,
                        options.map((option) => option.id),
                      ),
                      gte(table.index, 0),
                      eq(table.roomId, roomId),
                      eq(table.tenantId, tenantId),
                    ),
                  ),
                )
                .then(() => options),
            ),
        );

        const findByIds = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findByIds",
        )(
          (
            ids: ReadonlyArray<schema.DeliveryOption["id"]>,
            tenantId: schema.DeliveryOption["tenantId"],
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

        return { upsert, findByIds } as const;
      }),
    },
  ) {}
}
