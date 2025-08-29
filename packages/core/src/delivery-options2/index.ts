import {
  and,
  asc,
  desc,
  eq,
  getTableName,
  getViewName,
  gte,
  inArray,
  lte,
  not,
  notInArray,
  sql,
} from "drizzle-orm";
import { Array, Effect, Number, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
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
        const table = DeliveryOptionsSchema.table;
        const activeView = DeliveryOptionsSchema.activeView;
        const activePublishedRoomView =
          DeliveryOptionsSchema.activePublishedRoomView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

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

        const upsertMany = Effect.fn("DeliveryOptions.Repository.upsertMany")(
          (
            deliveryOptions: Array<
              InferInsertModel<DeliveryOptionsSchema.Table>
            >,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(deliveryOptions)
                .onConflictDoUpdate({
                  target: [table.id, table.tenantId],
                  set: buildConflictSet(table),
                })
                .returning(),
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

        const findActivePublishedRoomCreates = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomCreates",
        )(
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "DeliveryOptions.Repository.findActiveUpdates",
        )(
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

        const findActivePublishedRoomUpdates = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomUpdates",
        )(
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

                    return tx.select(cte[getTableName(table)]).from(cte);
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

        const findActivePublishedRoomFastForward = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomFastForward",
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
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findTailIndexByRoomId = Effect.fn(
          "DeliveryOptions.Repository.findTailIndexByRoomId",
        )(
          (
            roomId: DeliveryOptionsSchema.Row["roomId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ index: table.index })
                  .from(table)
                  .where(
                    and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                  )
                  .orderBy(desc(table.index))
                  .limit(1),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findSliceByRoomId = Effect.fn(
          "DeliveryOptions.Repository.findSliceByRoomId",
        )(
          (
            start: DeliveryOptionsSchema.Row["index"],
            end: DeliveryOptionsSchema.Row["index"],
            roomId: DeliveryOptionsSchema.Row["roomId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
          ) =>
            Effect.succeed(Number.sign(end - start) > 0).pipe(
              Effect.flatMap((isAscending) =>
                db.useTransaction((tx) =>
                  tx
                    .select()
                    .from(table)
                    .where(
                      and(
                        eq(table.roomId, roomId),
                        eq(table.tenantId, tenantId),
                        isAscending
                          ? and(gte(table.index, start), lte(table.index, end))
                          : and(lte(table.index, start), gte(table.index, end)),
                      ),
                    )
                    .orderBy(
                      isAscending ? asc(table.index) : desc(table.index),
                    ),
                ),
              ),
            ),
        );

        const negateIndexes = Effect.fn(
          "DeliveryOptions.Repository.negateIndexes",
        )(
          (
            ids: ReadonlyArray<DeliveryOptionsSchema.Row["id"]>,
            roomId: DeliveryOptionsSchema.Row["roomId"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ index: sql`-${table.index}` })
                .where(
                  and(
                    inArray(table.id, ids),
                    eq(table.roomId, roomId),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .returning(),
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
          upsertMany,
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
          findTailIndexByRoomId,
          findSliceByRoomId,
          negateIndexes,
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
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const append = DataAccessContract.makeMutation(
          DeliveryOptionsContract.append,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:create"),
            mutator: (deliveryOption, { tenantId }) =>
              repository
                .findTailIndexByRoomId(deliveryOption.roomId, tenantId)
                .pipe(
                  Effect.catchTag("NoSuchElementException", () =>
                    Effect.succeed({ index: -1 }),
                  ),
                  Effect.map(({ index }) => ++index),
                  Effect.flatMap((index) =>
                    repository.create({ ...deliveryOption, index, tenantId }),
                  ),
                  Effect.map(Struct.omit("version")),
                ),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          DeliveryOptionsContract.edit,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:update"),
            mutator: ({ id, ...deliveryOption }, session) =>
              repository
                .updateById(id, deliveryOption, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const reorder = DataAccessContract.makeMutation(
          DeliveryOptionsContract.reorder,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:update"),
            mutator: ({ oldIndex, newIndex, updatedAt, roomId }, session) =>
              Effect.gen(function* () {
                const delta = newIndex - oldIndex;
                const shift = -Number.sign(delta);

                const slice = yield* repository.findSliceByRoomId(
                  oldIndex,
                  newIndex,
                  roomId,
                  session.tenantId,
                );

                const sliceLength = slice.length;
                const absoluteDelta = Math.abs(delta);
                if (sliceLength !== absoluteDelta)
                  return yield* Effect.fail(
                    new DeliveryOptionsContract.InvalidReorderDeltaError({
                      sliceLength,
                      absoluteDelta,
                    }),
                  );

                // Temporarily negate indexes to avoid uniqueness violations in upsert
                yield* repository.negateIndexes(
                  Array.map(slice, ({ id }) => id),
                  roomId,
                  session.tenantId,
                );

                return yield* repository.upsertMany(
                  Array.map(slice, (option, sliceIndex) => ({
                    ...option,
                    index: option.index + (sliceIndex === 0 ? delta : shift),
                    updatedAt,
                  })),
                );
              }),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          DeliveryOptionsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:delete"),
            mutator: ({ id, deletedAt }, session) =>
              repository
                .updateById(id, { deletedAt }, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
