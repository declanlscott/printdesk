import {
  and,
  eq,
  getTableName,
  getViewName,
  gte,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Option, Schema } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Replicache } from "../replicache2";
import { replicacheClientViewMetadataTable } from "../replicache2/sql";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "./contracts";
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
import type { ReplicacheClientViewMetadata } from "../replicache2/sql";
import type { DeliveryOption, Room, RoomsTable, WorkflowStatus } from "./sql";

export namespace Rooms {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/rooms/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = roomsTable;
        const activeView = activeRoomsView;
        const activePublishedView = activePublishedRoomsView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const create = Effect.fn("Rooms.Repository.create")(
          (room: InferInsertModel<RoomsTable>) =>
            db
              .useTransaction((tx) => tx.insert(table).values(room).returning())
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("Rooms.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActiveCreates = Effect.fn(
          "Rooms.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findActivePublishedCreates = Effect.fn(
          "Rooms.Repository.findActivePublishedCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activePublishedView)
                          .where(eq(activePublishedView.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn("Rooms.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Rooms.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeView.version,
                                ),
                              ),
                              eq(metadataTable.tenantId, activeView.tenantId),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedUpdates = Effect.fn(
          "Rooms.Repository.findActivePublishedUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePublishedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePublishedView.tenantId,
                              ),
                            ),
                          )
                          .where(eq(activePublishedView.tenantId, tenantId)),
                      );

                    return tx
                      .select(cte[getViewName(activePublishedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Rooms.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "Rooms.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActivePublishedDeletes = Effect.fn(
          "Rooms.Repository.findActivePublishedDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activePublishedView.id })
                        .from(activePublishedView)
                        .where(eq(activePublishedView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn("Rooms.Repository.findFastForward")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
            excludeIds: Array<Room["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "Rooms.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
            excludeIds: Array<Room["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedFastForward = Effect.fn(
          "Rooms.Repository.findActivePublishedFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Room["tenantId"],
            excludeIds: Array<Room["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedView.id,
                              ),
                              notInArray(activePublishedView.id, excludeIds),
                            ),
                          )
                          .where(eq(activePublishedView.tenantId, tenantId)),
                      );

                    return tx
                      .select(cte[getViewName(activePublishedView)])
                      .from(cte);
                  }),
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
          updateById,
          deleteById,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/rooms/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const create = DataAccessContract.makeMutation(
          RoomsContract.create,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:create"),
            mutator: (room, { tenantId }) =>
              repository.create({ ...room, tenantId }),
          }),
        );

        const update = DataAccessContract.makeMutation(
          RoomsContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, ...room }, session) =>
              repository.updateById(id, room, session.tenantId),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          RoomsContract.delete_,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id, deletedAt }, session) =>
              repository.deleteById(id, deletedAt, session.tenantId),
          }),
        );

        const restore = DataAccessContract.makeMutation(
          RoomsContract.restore,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id }, session) =>
              repository.updateById(id, { deletedAt: null }, session.tenantId),
          }),
        );

        return { create, update, delete: delete_, restore } as const;
      }),
    },
  ) {}

  export class WorkflowRepository extends Effect.Service<WorkflowRepository>()(
    "@printdesk/core/rooms/WorkflowRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = workflowStatusesTable;
        const publishedRoomView = activePublishedRoomWorkflowStatusesView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const upsert = Effect.fn("Rooms.WorkflowRepository.upsert")(
          (
            workflow: typeof WorkflowsContract.Workflow.Type,
            roomId: WorkflowStatus["roomId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
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
                    tx
                      .delete(table)
                      .where(
                        and(
                          notInArray(
                            table.id,
                            workflow.map((status) => status.id),
                          ),
                          gte(table.index, 0),
                          eq(table.roomId, roomId),
                          eq(table.tenantId, tenantId),
                        ),
                      )
                      .then(() => workflow),
                  ),
              )
              .pipe(
                Effect.map(
                  Array.filterMap((status) =>
                    status.type !== "Review"
                      ? Option.some(
                          status as WorkflowStatus & {
                            readonly type: Exclude<
                              WorkflowStatus["type"],
                              "Review"
                            >;
                          },
                        )
                      : Option.none(),
                  ),
                ),
                Effect.flatMap(
                  Schema.decodeUnknown(WorkflowsContract.Workflow),
                ),
              ),
        );

        const findCreates = Effect.fn("Rooms.WorkflowRepository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findPublishedRoomCreates = Effect.fn(
          "Rooms.WorkflowRepository.findPublishedRoomCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(publishedRoomView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(publishedRoomView)
                          .where(eq(publishedRoomView.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn("Rooms.WorkflowRepository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findPublishedRoomUpdates = Effect.fn(
          "Rooms.WorkflowRepository.findPublishedRoomUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(publishedRoomView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            publishedRoomView,
                            and(
                              eq(metadataTable.entityId, publishedRoomView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  publishedRoomView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                publishedRoomView.tenantId,
                              ),
                            ),
                          )
                          .where(eq(publishedRoomView.tenantId, tenantId)),
                      );

                    return tx
                      .select(cte[getViewName(publishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Rooms.WorkflowRepository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findPublishedRoomDeletes = Effect.fn(
          "Rooms.WorkflowRepository.findPublishedRoomDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: publishedRoomView.id })
                        .from(publishedRoomView)
                        .where(eq(publishedRoomView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "Rooms.WorkflowRepository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
            excludeIds: Array<WorkflowStatus["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findPublishedRoomFastForward = Effect.fn(
          "Rooms.WorkflowRepository.findPublishedRoomFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: WorkflowStatus["tenantId"],
            excludeIds: Array<WorkflowStatus["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(publishedRoomView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            publishedRoomView,
                            and(
                              eq(metadataTable.entityId, publishedRoomView.id),
                              notInArray(publishedRoomView.id, excludeIds),
                            ),
                          )
                          .where(eq(publishedRoomView.tenantId, tenantId)),
                      );

                    return tx
                      .select(cte[getViewName(publishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        return {
          upsert,
          findCreates,
          findPublishedRoomCreates,
          findUpdates,
          findPublishedRoomUpdates,
          findDeletes,
          findPublishedRoomDeletes,
          findFastForward,
          findPublishedRoomFastForward,
        } as const;
      }),
    },
  ) {}

  export class WorkflowMutations extends Effect.Service<WorkflowMutations>()(
    "@printdesk/core/rooms/WorkflowMutations",
    {
      accessors: true,
      dependencies: [WorkflowRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WorkflowRepository;

        const set = DataAccessContract.makeMutation(
          WorkflowsContract.set,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:create"),
            mutator: ({ workflow, roomId }, session) =>
              repository.upsert(workflow, roomId, session.tenantId),
          }),
        );

        return { set } as const;
      }),
    },
  ) {}

  export class DeliveryOptionsRepository extends Effect.Service<DeliveryOptionsRepository>()(
    "@printdesk/core/rooms/DeliveryOptionsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = deliveryOptionsTable;
        const publishedRoomView = activePublishedRoomDeliveryOptionsView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const upsert = Effect.fn("Rooms.DeliveryOptionsRepository.upsert")(
          (
            options: typeof DeliveryOptionsContract.DeliveryOptions.Type,
            roomId: DeliveryOption["roomId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
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
                    tx
                      .delete(table)
                      .where(
                        and(
                          notInArray(
                            table.id,
                            options.map((option) => option.id),
                          ),
                          gte(table.index, 0),
                          eq(table.roomId, roomId),
                          eq(table.tenantId, tenantId),
                        ),
                      )
                      .then(() => options),
                  ),
              )
              .pipe(
                Effect.flatMap(
                  Schema.decode(DeliveryOptionsContract.DeliveryOptions),
                ),
              ),
        );

        const findCreates = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findPublishedRoomCreates = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findPublishedRoomCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(publishedRoomView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(publishedRoomView)
                          .where(eq(publishedRoomView.tenantId, tenantId)),
                      );

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findPublishedRoomUpdates = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findPublishedRoomUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(publishedRoomView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            publishedRoomView,
                            and(
                              eq(metadataTable.entityId, publishedRoomView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  publishedRoomView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                publishedRoomView.tenantId,
                              ),
                            ),
                          )
                          .where(eq(publishedRoomView.tenantId, tenantId)),
                      );

                    return tx
                      .select(cte[getViewName(publishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findPublishedRoomDeletes = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findPublishedRoomDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: publishedRoomView.id })
                        .from(publishedRoomView)
                        .where(eq(publishedRoomView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
            excludeIds: Array<DeliveryOption["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findPublishedRoomFastForward = Effect.fn(
          "Rooms.DeliveryOptionsRepository.findPublishedRoomFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: DeliveryOption["tenantId"],
            excludeIds: Array<DeliveryOption["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(publishedRoomView)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            publishedRoomView,
                            and(
                              eq(metadataTable.entityId, publishedRoomView.id),
                              notInArray(publishedRoomView.id, excludeIds),
                            ),
                          )
                          .where(eq(publishedRoomView.tenantId, tenantId)),
                      );

                    return tx
                      .select(cte[getViewName(publishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        return {
          upsert,
          findCreates,
          findPublishedRoomCreates,
          findUpdates,
          findPublishedRoomUpdates,
          findDeletes,
          findPublishedRoomDeletes,
          findFastForward,
          findPublishedRoomFastForward,
        } as const;
      }),
    },
  ) {}

  export class DeliveryOptionsMutations extends Effect.Service<DeliveryOptionsMutations>()(
    "@printdesk/core/rooms/DeliveryOptionsMutations",
    {
      accessors: true,
      dependencies: [DeliveryOptionsRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* DeliveryOptionsRepository;

        const set = DataAccessContract.makeMutation(
          DeliveryOptionsContract.set,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:create"),
            mutator: ({ options, roomId }, session) =>
              repository.upsert(options, roomId, session.tenantId),
          }),
        );

        return { set } as const;
      }),
    },
  ) {}
}
