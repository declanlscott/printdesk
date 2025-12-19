import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Database } from "../database";
import { Events } from "../events";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache";
import { ReplicacheNotifier } from "../replicache/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache/schemas";
import { Rooms } from "../rooms";
import { DeliveryOptionsContract } from "./contract";
import { DeliveryOptionsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache/schemas";

export namespace DeliveryOptions {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/delivery-options/Repository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = DeliveryOptionsSchema.table.definition;
        const activeView = DeliveryOptionsSchema.activeView;
        const activePublishedRoomView =
          DeliveryOptionsSchema.activePublishedRoomView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_creates`)
                    .as(
                      tx
                        .select()
                        .from(table)
                        .where(eq(table.tenantId, clientView.tenantId)),
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
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activePublishedRoomView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activePublishedRoomView)
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_updates`)
                    .as(
                      qb
                        .innerJoin(
                          table,
                          and(
                            eq(entriesTable.entityId, table.id),
                            not(eq(entriesTable.entityVersion, table.version)),
                            eq(entriesTable.tenantId, table.tenantId),
                          ),
                        )
                        .where(eq(table.tenantId, clientView.tenantId)),
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
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_updates`)
                  .as(
                    qb
                      .innerJoin(
                        activeView,
                        and(
                          eq(entriesTable.entityId, activeView.id),
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activePublishedRoomView)}_updates`)
                  .as(
                    qb
                      .innerJoin(
                        activePublishedRoomView,
                        and(
                          eq(entriesTable.entityId, activePublishedRoomView.id),
                          not(
                            eq(
                              entriesTable.entityVersion,
                              activePublishedRoomView.version,
                            ),
                          ),
                          eq(
                            entriesTable.tenantId,
                            activePublishedRoomView.tenantId,
                          ),
                        ),
                      )
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder
              .deletes(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, clientView.tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "DeliveryOptions.Repository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
            .pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeView.id })
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  ),
                ),
              ),
            ),
        );

        const findActivePublishedRoomDeletes = Effect.fn(
          "DeliveryOptions.Repository.findActivePublishedRoomDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
            .pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activePublishedRoomView.id })
                      .from(activePublishedRoomView)
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findFastForward = Effect.fn(
          "DeliveryOptions.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<DeliveryOptionsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, clientView.tenantId)),
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
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<DeliveryOptionsSchema.ActiveRow["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, clientView.tenantId)),
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
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              DeliveryOptionsSchema.ActivePublishedRoomRow["id"]
            >,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                                entriesTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              notInArray(
                                activePublishedRoomView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            eq(
                              activePublishedRoomView.tenantId,
                              clientView.tenantId,
                            ),
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

        const findById = Effect.fn("DeliveryOptions.Repository.findById")(
          (
            id: DeliveryOptionsSchema.Row["id"],
            tenantId: DeliveryOptionsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
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
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set(deliveryOption)
                .where(
                  and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                )
                .returning(),
            ),
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
          findById,
          updateById,
          updateByRoomId,
        } as const;
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/delivery-options/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(DeliveryOptionsSchema.table.definition),
          )
            .query(AccessControl.permission("delivery_options:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_delivery_options:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission(
                "active_published_room_delivery_options:read",
              ),
              {
                findCreates: repository.findActivePublishedRoomCreates,
                findUpdates: repository.findActivePublishedRoomUpdates,
                findDeletes: repository.findActivePublishedRoomDeletes,
                fastForward: repository.findActivePublishedRoomFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/delivery-options/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const canEdit = PoliciesContract.makePolicy(
          DeliveryOptionsContract.canEdit,
          {
            make: Effect.fn("DeliveryOptions.Policies.canEdit.make")(({ id }) =>
              AccessControl.privatePolicy(({ tenantId }) =>
                repository
                  .findById(id, tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
            ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          DeliveryOptionsContract.canDelete,
          {
            make: Effect.fn("DeliveryOptions.Policies.canDelete.make")(
              canEdit.make,
            ),
          },
        );

        const canRestore = PoliciesContract.makePolicy(
          DeliveryOptionsContract.canRestore,
          {
            make: Effect.fn("DeliveryOptions.Policies.canRestore.make")(
              ({ id }) =>
                AccessControl.privatePolicy(({ tenantId }) =>
                  repository
                    .findById(id, tenantId)
                    .pipe(
                      Effect.map(Struct.get("deletedAt")),
                      Effect.map(Predicate.isNotNull),
                    ),
                ),
            ),
          },
        );

        return { canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/delivery-options/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const roomsRepository = yield* Rooms.Repository;

        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (
          deliveryOption: DeliveryOptionsContract.DataTransferObject,
        ) =>
          roomsRepository
            .findById(deliveryOption.roomId, deliveryOption.tenantId)
            .pipe(
              Effect.map((room) =>
                Match.value(room).pipe(
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
                  Match.orElse(() =>
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
              ),
              Effect.map(notifier.notify),
            );
        const notifyEdit = notifyCreate;
        const notifyDelete = notifyCreate;
        const notifyRestore = notifyCreate;

        const create = MutationsContract.makeMutation(
          DeliveryOptionsContract.create,
          {
            makePolicy: Effect.fn(
              "DeliveryOptions.Mutations.create.makePolicy",
            )(() => AccessControl.permission("delivery_options:create")),
            mutator: Effect.fn("DeliveryOptions.Mutations.create.mutator")(
              (deliveryOption, { tenantId }) =>
                repository
                  .create({ ...deliveryOption, tenantId })
                  .pipe(Effect.tap(notifyCreate)),
            ),
          },
        );

        const edit = MutationsContract.makeMutation(
          DeliveryOptionsContract.edit,
          {
            makePolicy: Effect.fn("DeliveryOptions.Mutations.edit.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("delivery_options:update"),
                  policies.canEdit.make({ id }),
                ),
            ),
            mutator: Effect.fn("DeliveryOptions.Mutations.edit.mutator")(
              ({ id, ...deliveryOption }, user) =>
                repository
                  .updateById(id, deliveryOption, user.tenantId)
                  .pipe(Effect.tap(notifyEdit)),
            ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          DeliveryOptionsContract.delete_,
          {
            makePolicy: Effect.fn(
              "DeliveryOptions.Mutations.delete.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission("delivery_options:delete"),
                policies.canDelete.make({ id }),
              ),
            ),
            mutator: Effect.fn("DeliveryOptions.Mutations.delete.mutator")(
              ({ id, deletedAt }, user) =>
                repository
                  .updateById(id, { deletedAt }, user.tenantId)
                  .pipe(Effect.tap(notifyDelete)),
            ),
          },
        );

        const restore = MutationsContract.makeMutation(
          DeliveryOptionsContract.restore,
          {
            makePolicy: Effect.fn(
              "DeliveryOptions.Mutations.restore.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission("delivery_options:delete"),
                policies.canRestore.make({ id }),
              ),
            ),
            mutator: Effect.fn("DeliveryOptions.Mutations.restore.mutator")(
              ({ id }, user) =>
                repository
                  .updateById(id, { deletedAt: null }, user.tenantId)
                  .pipe(Effect.tap(notifyRestore)),
            ),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
