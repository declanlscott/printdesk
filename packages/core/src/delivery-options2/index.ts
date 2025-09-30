import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Match, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Events } from "../events2";
import { Permissions } from "../permissions2";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { Rooms } from "../rooms2";
import { DeliveryOptionsContract } from "./contract";
import { DeliveryOptionsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace DeliveryOptions {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/delivery-options/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = DeliveryOptionsSchema.table.definition;
        const activeView = DeliveryOptionsSchema.activeView;
        const activePublishedRoomView =
          DeliveryOptionsSchema.activePublishedRoomView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

        const create = Effect.fn("DeliveryOptions.Repository.create")(
          (deliveryOption: InferInsertModel<DeliveryOptionsSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(deliveryOption).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("DeliveryOptions.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
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
                      .with(cte)
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
          "DeliveryOptions.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActiveRow["tenantId"],
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
                      .with(cte)
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

        const findActivePublishedRoomCreates = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActivePublishedRoomRow["tenantId"],
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
                      .$with(`${getViewName(activePublishedRoomView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activePublishedRoomView)
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .with(cte)
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

        const findUpdates = Effect.fn("DeliveryOptions.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "DeliveryOptions.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActiveRow["tenantId"],
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedRoomUpdates = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActivePublishedRoomRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedRoomView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedRoomView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePublishedRoomView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePublishedRoomView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("DeliveryOptions.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
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
          "DeliveryOptions.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActiveRow["tenantId"],
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

        const findActivePublishedRoomDeletes = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActivePublishedRoomRow["tenantId"],
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
                        .select({ id: activePublishedRoomView.id })
                        .from(activePublishedRoomView)
                        .where(eq(activePublishedRoomView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "DeliveryOptions.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
            excludeIds: Array<DeliveryOptionsSchema.Row["id"]>,
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "DeliveryOptions.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActiveRow["tenantId"],
            excludeIds: Array<DeliveryOptionsSchema.ActiveRow["id"]>,
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedRoomFastForward = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: DeliveryOptionsSchema.ActivePublishedRoomRow["tenantId"],
            excludeIds: Array<
              DeliveryOptionsSchema.ActivePublishedRoomRow["id"]
            >,
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
                      .$with(
                        `${getViewName(activePublishedRoomView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activePublishedRoomView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              notInArray(
                                activePublishedRoomView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const updateById = Effect.fn("DeliveryOptions.Repository.updateById")(
          (
            id: DeliveryOptionsSchema.Row["id"],
            deliveryOption: Partial<
              Omit<DeliveryOptionsSchema.Row, "id" | "tenantId">
            >,
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(deliveryOption)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateByRoomId = Effect.fn(
          "DeliveryOptions.Repository.updateByRoomId",
        )(
          (
            roomId: DeliveryOptionsSchema.Row["roomId"],
            deliveryOption: Partial<
              Omit<DeliveryOptionsSchema.Row, "id" | "roomId" | "tenantId">
            >,
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(deliveryOption)
                  .where(
                    and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
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
          updateById,
          updateByRoomId,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/delivery-options/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default, Permissions.Schemas.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const roomsRepository = yield* Rooms.Repository;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notify = (
          deliveryOption: DeliveryOptionsContract.DataTransferObject,
        ) =>
          roomsRepository
            .findById(deliveryOption.roomId, deliveryOption.tenantId)
            .pipe(
              Effect.map(Match.value),
              Effect.map(
                Match.whenAnd(
                  { deletedAt: Match.null },
                  { status: Match.is("published") },
                  () =>
                    Array.make(
                      PullPermission.make({
                        permission: "delivery_options:read",
                      }),
                      PullPermission.make({
                        permission: "active_delivery_options:read",
                      }),
                      PullPermission.make({
                        permission:
                          "active_published_room_delivery_options:read",
                      }),
                    ),
                ),
              ),
              Effect.map(
                Match.whenAnd({ deletedAt: Match.null }, () =>
                  Array.make(
                    PullPermission.make({
                      permission: "delivery_options:read",
                    }),
                    PullPermission.make({
                      permission: "active_delivery_options:read",
                    }),
                  ),
                ),
              ),
              Effect.map(
                Match.orElse(() =>
                  Array.make(
                    PullPermission.make({
                      permission: "delivery_options:read",
                    }),
                  ),
                ),
              ),
              Effect.flatMap(notifier.notify),
            );

        const create = DataAccessContract.makeMutation(
          DeliveryOptionsContract.create,
          {
            makePolicy: Effect.fn(
              "DeliveryOptions.Mutations.create.makePolicy",
            )(() => AccessControl.permission("delivery_options:create")),
            mutator: Effect.fn("DeliveryOptions.Mutations.create.mutator")(
              (deliveryOption, { tenantId }) =>
                repository
                  .create({ ...deliveryOption, tenantId })
                  .pipe(Effect.map(Struct.omit("version")), Effect.tap(notify)),
            ),
          },
        );

        const update = DataAccessContract.makeMutation(
          DeliveryOptionsContract.update,
          {
            makePolicy: Effect.fn(
              "DeliveryOptions.Mutations.update.makePolicy",
            )(() => AccessControl.permission("delivery_options:update")),
            mutator: Effect.fn("DeliveryOptions.Mutations.update.mutator")(
              ({ id, ...deliveryOption }, session) =>
                repository
                  .updateById(id, deliveryOption, session.tenantId)
                  .pipe(Effect.map(Struct.omit("version")), Effect.tap(notify)),
            ),
          },
        );

        const delete_ = DataAccessContract.makeMutation(
          DeliveryOptionsContract.delete_,
          {
            makePolicy: Effect.fn(
              "DeliveryOptions.Mutations.delete.makePolicy",
            )(() => AccessControl.permission("delivery_options:delete")),
            mutator: Effect.fn("DeliveryOptions.Mutations.delete.mutator")(
              ({ id, deletedAt }, session) =>
                repository
                  .updateById(id, { deletedAt }, session.tenantId)
                  .pipe(Effect.map(Struct.omit("version")), Effect.tap(notify)),
            ),
          },
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
