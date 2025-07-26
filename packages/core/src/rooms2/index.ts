import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Sync } from "../sync2";
import {
  createRoom,
  deleteRoom,
  restoreRoom,
  setDeliveryOptions,
  setWorkflow,
  updateRoom,
} from "./shared";
import {
  activePublishedRoomDeliveryOptionsView,
  activePublishedRoomsView,
  activePublishedRoomWorkflowStatusesView,
  activeRoomsView,
  deliveryOptionsTable,
  roomsTable,
  workflowStatusesTable,
} from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { DeliveryOptions, Workflow } from "./shared";
import type { DeliveryOption, Room, RoomsTable, WorkflowStatus } from "./sql";

export namespace Rooms {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/rooms/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = roomsTable;
        const activeView = activeRoomsView;
        const activePublishedView = activePublishedRoomsView;

        const create = Effect.fn("Rooms.Repository.create")(
          (room: InferInsertModel<RoomsTable>) =>
            db
              .useTransaction((tx) => tx.insert(table).values(room).returning())
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Rooms.Repository.getMetadata")(
          (tenantId: Room["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Rooms.Repository.getActiveMetadata",
        )((tenantId: Room["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActivePublishedMetadata = Effect.fn(
          "Rooms.Repository.getActivePublishedMetadata",
        )((tenantId: Room["tenantId"]) =>
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
          (ids: ReadonlyArray<Room["id"]>, tenantId: Room["tenantId"]) =>
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
            id: Room["id"],
            room: Partial<Omit<Room, "id" | "tenantId">>,
            tenantId: Room["tenantId"],
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
            id: Room["id"],
            deletedAt: NonNullable<Room["deletedAt"]>,
            tenantId: Room["tenantId"],
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

  export class SyncMutations extends Effect.Service<SyncMutations>()(
    "@printdesk/core/rooms/SyncMutations",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const create = Sync.Mutation(
          createRoom,
          () => AccessControl.permission("rooms:create"),
          (room, { tenantId }) => repository.create({ ...room, tenantId }),
        );

        const update = Sync.Mutation(
          updateRoom,
          () => AccessControl.permission("rooms:update"),
          ({ id, ...room }, session) =>
            repository.updateById(id, room, session.tenantId),
        );

        const delete_ = Sync.Mutation(
          deleteRoom,
          () => AccessControl.permission("rooms:delete"),
          ({ id, deletedAt }, session) =>
            repository.deleteById(id, deletedAt, session.tenantId),
        );

        const restore = Sync.Mutation(
          restoreRoom,
          () => AccessControl.permission("rooms:delete"),
          ({ id }, session) =>
            repository.updateById(id, { deletedAt: null }, session.tenantId),
        );

        return { create, update, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class WorkflowRepository extends Effect.Service<WorkflowRepository>()(
    "@printdesk/core/rooms/WorkflowRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = workflowStatusesTable;
        const publishedRoomView = activePublishedRoomWorkflowStatusesView;

        const upsert = Effect.fn("Rooms.WorkflowRepository.upsert")(
          (
            workflow: (typeof Workflow)["Type"],
            roomId: WorkflowStatus["roomId"],
            tenantId: WorkflowStatus["tenantId"],
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
                  }, [] as Array<WorkflowStatus>),
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
          (tenantId: WorkflowStatus["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getPublishedRoomMetadata = Effect.fn(
          "Rooms.WorkflowRepository.getPublishedRoomMetadata",
        )((tenantId: WorkflowStatus["tenantId"]) =>
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
            ids: ReadonlyArray<WorkflowStatus["id"]>,
            tenantId: WorkflowStatus["tenantId"],
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

  export class WorkflowSyncMutations extends Effect.Service<WorkflowSyncMutations>()(
    "@printdesk/core/rooms/WorkflowSyncMutations",
    {
      dependencies: [WorkflowRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WorkflowRepository;

        const set = Sync.Mutation(
          setWorkflow,
          () => AccessControl.permission("workflow_statuses:create"),
          ({ roomId, workflow }, session) =>
            repository.upsert(workflow, roomId, session.tenantId),
        );

        return { set } as const;
      }),
    },
  ) {}

  export class DeliveryOptionsRepository extends Effect.Service<DeliveryOptionsRepository>()(
    "@printdesk/core/rooms/DeliveryOptionsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = deliveryOptionsTable;
        const publishedRoomView = activePublishedRoomDeliveryOptionsView;

        const upsert = Effect.fn("Rooms.DeliveryOptionsRepository.upsert")(
          (
            options: (typeof DeliveryOptions)["Type"],
            roomId: DeliveryOption["roomId"],
            tenantId: DeliveryOption["tenantId"],
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
                  }, [] as Array<DeliveryOption>),
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
        )((tenantId: DeliveryOption["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: table.id, version: table.version })
              .from(table)
              .where(eq(table.tenantId, tenantId)),
          ),
        );

        const getPublishedRoomMetadata = Effect.fn(
          "Rooms.DeliveryOptionsRepository.getPublishedRoomMetadata",
        )((tenantId: DeliveryOption["tenantId"]) =>
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
            ids: ReadonlyArray<DeliveryOption["id"]>,
            tenantId: DeliveryOption["tenantId"],
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

  export class DeliveryOptionsSyncMutations extends Effect.Service<DeliveryOptionsSyncMutations>()(
    "@printdesk/core/rooms/DeliveryOptionsSyncMutations",
    {
      dependencies: [DeliveryOptionsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* DeliveryOptionsRepository;

        const set = Sync.Mutation(
          setDeliveryOptions,
          () => AccessControl.permission("delivery_options:create"),
          ({ options, roomId }, session) =>
            repository.upsert(options, roomId, session.tenantId),
        );

        return { set } as const;
      }),
    },
  ) {}
}
