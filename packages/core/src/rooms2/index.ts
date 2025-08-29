import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Struct, Tuple } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Products } from "../products2";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { RoomWorkflows } from "../workflows2";
import { RoomsContract } from "./contracts";
import { RoomsSchema } from "./schemas";

import type { InferInsertModel } from "drizzle-orm";

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
        const table = RoomsSchema.table;
        const activeView = RoomsSchema.activeView;
        const activePublishedView = RoomsSchema.activePublishedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const create = Effect.fn("Rooms.Repository.create")(
          (room: InferInsertModel<RoomsSchema.Table>) =>
            db
              .useTransaction((tx) => tx.insert(table).values(room).returning())
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("Rooms.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
            excludeIds: Array<RoomsSchema.Row["id"]>,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
            excludeIds: Array<RoomsSchema.Row["id"]>,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomsSchema.Row["tenantId"],
            excludeIds: Array<RoomsSchema.Row["id"]>,
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
            id: RoomsSchema.Row["id"],
            room: Partial<Omit<RoomsSchema.Row, "id" | "tenantId">>,
            tenantId: RoomsSchema.Row["tenantId"],
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
        const workflowsRepository = yield* RoomWorkflows.Repository;
        const productsRepository = yield* Products.Repository;

        const create = DataAccessContract.makeMutation(
          RoomsContract.create,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:create"),
            mutator: ({ workflowId, ...room }, { tenantId }) =>
              Effect.all(
                Tuple.make(
                  repository
                    .create({ ...room, tenantId })
                    .pipe(Effect.map(Struct.omit("version"))),
                  workflowsRepository.create({
                    id: workflowId,
                    roomId: room.id,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    tenantId,
                  }),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0))),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          RoomsContract.edit,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, ...room }, session) =>
              repository
                .updateById(id, room, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const publish = DataAccessContract.makeMutation(
          RoomsContract.publish,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, updatedAt }, session) =>
              repository
                .updateById(
                  id,
                  { status: "published", updatedAt },
                  session.tenantId,
                )
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const draft = DataAccessContract.makeMutation(
          RoomsContract.draft,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:update"),
            mutator: ({ id, updatedAt }, session) =>
              Effect.all(
                Tuple.make(
                  repository
                    .updateById(
                      id,
                      { status: "draft", updatedAt },
                      session.tenantId,
                    )
                    .pipe(Effect.map(Struct.omit("version"))),
                  productsRepository.updateByRoomId(
                    id,
                    { status: "draft", updatedAt },
                    session.tenantId,
                  ),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0))),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          RoomsContract.delete_,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id, deletedAt }, session) =>
              Effect.all(
                Tuple.make(
                  repository
                    .updateById(id, { deletedAt }, session.tenantId)
                    .pipe(Effect.map(Struct.omit("version"))),
                  workflowsRepository.updateByRoomId(
                    id,
                    { deletedAt },
                    session.tenantId,
                  ),
                  productsRepository.updateByRoomId(
                    id,
                    { deletedAt, status: "draft" },
                    session.tenantId,
                  ),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0))),
          }),
        );

        const restore = DataAccessContract.makeMutation(
          RoomsContract.restore,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("rooms:delete"),
            mutator: ({ id }, session) =>
              Effect.all(
                Tuple.make(
                  repository
                    .updateById(id, { deletedAt: null }, session.tenantId)
                    .pipe(Effect.map(Struct.omit("version"))),
                  workflowsRepository.updateByRoomId(
                    id,
                    { deletedAt: null },
                    session.tenantId,
                  ),
                  productsRepository.updateByRoomId(
                    id,
                    { deletedAt: null },
                    session.tenantId,
                  ),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0))),
          }),
        );

        return {
          create,
          edit,
          publish,
          draft,
          delete: delete_,
          restore,
        } as const;
      }),
    },
  ) {}
}
