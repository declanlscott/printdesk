import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { Schema } from "effect";
import type { DeliveryOptions, Workflow } from "./shared";

export namespace Rooms {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/rooms/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.roomsTable.table;
        const activeView = schema.activeRoomsView.view;
        const activePublishedView = schema.activePublishedRoomsView.view;

        const create = Effect.fn("Rooms.Repository.create")(
          (room: InferInsertModel<schema.RoomsTable>) =>
            db
              .useTransaction((tx) => tx.insert(table).values(room).returning())
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Rooms.Repository.getMetadata")(
          (tenantId: schema.Room["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Rooms.Repository.getActiveMetadata",
        )((tenantId: schema.Room["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActivePublishedMetadata = Effect.fn(
          "Rooms.Repository.getActivePublishedMetadata",
        )((tenantId: schema.Room["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({
                id: activePublishedView.id,
                version: activePublishedView.version,
              })
              .from(activePublishedView)
              .where(eq(activePublishedView.tenantId, tenantId)),
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

        const updateById = Effect.fn("Rooms.Repository.updateById")(
          (
            id: schema.Room["id"],
            room: Partial<Omit<schema.Room, "id" | "tenantId">>,
            tenantId: schema.Room["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(room)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("Rooms.Repository.deleteById")(
          (
            id: schema.Room["id"],
            deletedAt: NonNullable<schema.Room["deletedAt"]>,
            tenantId: schema.Room["tenantId"],
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
          getMetadata,
          getActiveMetadata,
          getActivePublishedMetadata,
          findByIds,
          updateById,
          deleteById,
        } as const;
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
        const publishedRoomView = schema.publishedRoomWorkflowStatusesView.view;

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

        const getMetadata = Effect.fn("Rooms.WorkflowRepository.getMetadata")(
          (tenantId: schema.WorkflowStatus["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getPublishedRoomMetadata = Effect.fn(
          "Rooms.WorkflowRepository.getPublishedRoomMetadata",
        )((tenantId: schema.WorkflowStatus["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({
                id: publishedRoomView.id,
                version: publishedRoomView.version,
              })
              .from(publishedRoomView)
              .where(eq(publishedRoomView.tenantId, tenantId)),
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

        return {
          upsert,
          getMetadata,
          getPublishedRoomMetadata,
          findByIds,
        } as const;
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
        const publishedRoomView = schema.publishedRoomDeliveryOptionsView.view;

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

        const getMetadata = Effect.fn(
          "Rooms.DeliveryOptionsRepository.getMetadata",
        )((tenantId: schema.DeliveryOption["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: table.id, version: table.version })
              .from(table)
              .where(eq(table.tenantId, tenantId)),
          ),
        );

        const getPublishedRoomMetadata = Effect.fn(
          "Rooms.DeliveryOptionsRepository.getPublishedRoomMetadata",
        )((tenantId: schema.DeliveryOption["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({
                id: publishedRoomView.id,
                version: publishedRoomView.version,
              })
              .from(publishedRoomView)
              .where(eq(publishedRoomView.tenantId, tenantId)),
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

        return {
          upsert,
          getMetadata,
          getPublishedRoomMetadata,
          findByIds,
        } as const;
      }),
    },
  ) {}
}
