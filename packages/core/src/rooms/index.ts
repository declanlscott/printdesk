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
import * as Tuple from "effect/Tuple";

import { AccessControl } from "../access-control";
import { Announcements } from "../announcements";
import { Database } from "../database";
import { DeliveryOptions } from "../delivery-options";
import { Events } from "../events";
import { MutationsContract } from "../mutations/contract";
import { PoliciesContract } from "../policies/contract";
import { Products } from "../products";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache";
import { ReplicacheNotifier } from "../replicache/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache/schemas";
import { RoomWorkflows } from "../workflows";
import { RoomsContract } from "./contract";
import { RoomsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache/schemas";

export namespace Rooms {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/rooms/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = RoomsSchema.table.definition;
        const activeView = RoomsSchema.activeView;
        const activePublishedView = RoomsSchema.activePublishedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

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
          "Rooms.Repository.findActiveCreates",
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

        const findActivePublishedCreates = Effect.fn(
          "Rooms.Repository.findActivePublishedCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activePublishedView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activePublishedView)
                      .where(
                        eq(activePublishedView.tenantId, clientView.tenantId),
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

        const findUpdates = Effect.fn("Rooms.Repository.findUpdates")(
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
          "Rooms.Repository.findActiveUpdates",
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

        const findActivePublishedUpdates = Effect.fn(
          "Rooms.Repository.findActivePublishedUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activePublishedView)}_updates`)
                  .as(
                    qb
                      .innerJoin(
                        activePublishedView,
                        and(
                          eq(entriesTable.entityId, activePublishedView.id),
                          not(
                            eq(
                              entriesTable.entityVersion,
                              activePublishedView.version,
                            ),
                          ),
                          eq(
                            entriesTable.tenantId,
                            activePublishedView.tenantId,
                          ),
                        ),
                      )
                      .where(
                        eq(activePublishedView.tenantId, clientView.tenantId),
                      ),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activePublishedView)])
                  .from(cte);
              }),
            ),
          ),
        );

        const findDeletes = Effect.fn("Rooms.Repository.findDeletes")(
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
          "Rooms.Repository.findActiveDeletes",
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

        const findActivePublishedDeletes = Effect.fn(
          "Rooms.Repository.findActivePublishedDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
            .pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activePublishedView.id })
                      .from(activePublishedView)
                      .where(
                        eq(activePublishedView.tenantId, clientView.tenantId),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findFastForward = Effect.fn("Rooms.Repository.findFastForward")(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<RoomsSchema.Row["id"]>,
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
          "Rooms.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<RoomsSchema.Row["id"]>,
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

        const findActivePublishedFastForward = Effect.fn(
          "Rooms.Repository.findActivePublishedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<RoomsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, activePublishedView.id),
                              notInArray(activePublishedView.id, excludeIds),
                            ),
                          )
                          .where(
                            eq(
                              activePublishedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn("Rooms.Repository.findById")(
          (id: RoomsSchema.Row["id"], tenantId: RoomsSchema.Row["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
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
          findById,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/rooms/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(RoomsSchema.table.definition),
          )
            .query(AccessControl.permission("rooms:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_rooms:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(AccessControl.permission("active_published_rooms:read"), {
              findCreates: repository.findActivePublishedCreates,
              findUpdates: repository.findActivePublishedUpdates,
              findDeletes: repository.findActivePublishedDeletes,
              fastForward: repository.findActivePublishedFastForward,
            })
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/rooms/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const canEdit = PoliciesContract.makePolicy(RoomsContract.canEdit, {
          make: Effect.fn("Rooms.Policies.canEdit.make")(({ id }) =>
            AccessControl.privatePolicy(({ tenantId }) =>
              repository
                .findById(id, tenantId)
                .pipe(
                  Effect.map(Struct.get("deletedAt")),
                  Effect.map(Predicate.isNull),
                ),
            ),
          ),
        });

        const canDelete = PoliciesContract.makePolicy(RoomsContract.canDelete, {
          make: Effect.fn("Rooms.Policies.canDelete.make")(canEdit.make),
        });

        const canRestore = PoliciesContract.makePolicy(
          RoomsContract.canRestore,
          {
            make: Effect.fn("Rooms.Policies.canRestore.make")(({ id }) =>
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
    "@printdesk/core/rooms/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Announcements.Repository.Default,
        DeliveryOptions.Repository.Default,
        Products.Repository.Default,
        RoomWorkflows.Repository.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const announcementsRepository = yield* Announcements.Repository;
        const deliveryOptionsRepository = yield* DeliveryOptions.Repository;
        const productsRepository = yield* Products.Repository;
        const workflowsRepository = yield* RoomWorkflows.Repository;

        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (room: RoomsContract.DataTransferObject) =>
          Match.value(room).pipe(
            Match.when({ status: Match.is("published") }, () =>
              Array.make(
                PullPermission.make({ permission: "rooms:read" }),
                PullPermission.make({ permission: "active_rooms:read" }),
                PullPermission.make({
                  permission: "active_published_rooms:read",
                }),
                PullPermission.make({ permission: "room_workflows:read" }),
                PullPermission.make({
                  permission: "active_room_workflows:read",
                }),
                PullPermission.make({
                  permission: "active_published_room_workflows:read",
                }),
              ),
            ),
            Match.orElse(() =>
              Array.make(
                PullPermission.make({ permission: "rooms:read" }),
                PullPermission.make({ permission: "active_rooms:read" }),
                PullPermission.make({ permission: "room_workflows:read" }),
                PullPermission.make({
                  permission: "active_room_workflows:read",
                }),
              ),
            ),
            notifier.notify,
          );

        const notifyEdit = (room: RoomsContract.DataTransferObject) =>
          Match.value(room).pipe(
            Match.when({ status: Match.is("published") }, () =>
              Array.make(
                PullPermission.make({ permission: "rooms:read" }),
                PullPermission.make({ permission: "active_rooms:read" }),
                PullPermission.make({
                  permission: "active_published_rooms:read",
                }),
              ),
            ),
            Match.orElse(() =>
              Array.make(
                PullPermission.make({ permission: "rooms:read" }),
                PullPermission.make({ permission: "active_rooms:read" }),
              ),
            ),
            notifier.notify,
          );

        const notifyPublish = (_room: RoomsContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "rooms:read" }),
              PullPermission.make({ permission: "active_rooms:read" }),
              PullPermission.make({
                permission: "active_published_rooms:read",
              }),
              PullPermission.make({
                permission: "active_published_room_announcements:read",
              }),
              PullPermission.make({
                permission: "active_published_room_delivery_options:read",
              }),
              PullPermission.make({
                permission: "active_published_room_workflows:read",
              }),
              PullPermission.make({
                permission: "active_published_products:read",
              }),
            ),
          );
        const notifyDraft = notifyPublish;

        const notifyDelete = (_room: RoomsContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "rooms:read" }),
              PullPermission.make({ permission: "active_rooms:read" }),
              PullPermission.make({
                permission: "active_published_rooms:read",
              }),
              PullPermission.make({ permission: "announcements:read" }),
              PullPermission.make({ permission: "active_announcements:read" }),
              PullPermission.make({
                permission: "active_published_room_announcements:read",
              }),
              PullPermission.make({ permission: "delivery_options:read" }),
              PullPermission.make({
                permission: "active_delivery_options:read",
              }),
              PullPermission.make({
                permission: "active_published_room_delivery_options:read",
              }),
              PullPermission.make({ permission: "room_workflows:read" }),
              PullPermission.make({
                permission: "active_room_workflows:read",
              }),
              PullPermission.make({
                permission: "active_published_room_workflows:read",
              }),
              PullPermission.make({ permission: "products:read" }),
              PullPermission.make({ permission: "active_products:read" }),
              PullPermission.make({
                permission: "active_published_products:read",
              }),
            ),
          );

        const notifyRestore = (_room: RoomsContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "rooms:read" }),
              PullPermission.make({ permission: "active_rooms:read" }),
              PullPermission.make({ permission: "room_workflows:read" }),
              PullPermission.make({
                permission: "active_room_workflows:read",
              }),
            ),
          );

        const create = MutationsContract.makeMutation(RoomsContract.create, {
          makePolicy: Effect.fn("Rooms.Mutations.create.makePolicy")(() =>
            AccessControl.permission("rooms:create"),
          ),
          mutator: Effect.fn("Rooms.Mutations.create.mutator")(
            ({ workflowId, ...room }, { tenantId }) =>
              Effect.all(
                Tuple.make(
                  repository.create({ ...room, tenantId }),
                  workflowsRepository.create({
                    id: workflowId,
                    roomId: room.id,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    tenantId,
                  }),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.getFirst), Effect.tap(notifyCreate)),
          ),
        });

        const edit = MutationsContract.makeMutation(RoomsContract.edit, {
          makePolicy: Effect.fn("Rooms.Mutations.edit.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Rooms.Mutations.edit.mutator")(
            ({ id, ...room }, user) =>
              repository
                .updateById(id, room, user.tenantId)
                .pipe(Effect.tap(notifyEdit)),
          ),
        });

        const publish = MutationsContract.makeMutation(RoomsContract.publish, {
          makePolicy: Effect.fn("Rooms.Mutations.publish.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("rooms:update"),
                policies.canEdit.make({ id }),
              ),
          ),
          mutator: Effect.fn("Rooms.Mutations.publish.mutator")(
            ({ id, updatedAt }, user) =>
              repository
                .updateById(
                  id,
                  { status: "published", updatedAt },
                  user.tenantId,
                )
                .pipe(Effect.tap(notifyPublish)),
          ),
        });

        const draft = MutationsContract.makeMutation(RoomsContract.draft, {
          makePolicy: Effect.fn("Rooms.Mutations.draft.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Rooms.Mutations.draft.mutator")(
            ({ id, updatedAt }, user) =>
              Effect.all(
                Tuple.make(
                  repository.updateById(
                    id,
                    { status: "draft", updatedAt },
                    user.tenantId,
                  ),
                  productsRepository.updateByRoomId(
                    id,
                    { status: "draft", updatedAt },
                    user.tenantId,
                  ),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.getFirst), Effect.tap(notifyDraft)),
          ),
        });

        const delete_ = MutationsContract.makeMutation(RoomsContract.delete_, {
          makePolicy: Effect.fn("Rooms.Mutations.delete.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:delete"),
              policies.canDelete.make({ id }),
            ),
          ),
          mutator: Effect.fn("Rooms.Mutations.delete.mutator")(
            ({ id, deletedAt }, user) =>
              Effect.all(
                Tuple.make(
                  repository.updateById(
                    id,
                    { deletedAt, status: "draft" },
                    user.tenantId,
                  ),
                  announcementsRepository.updateByRoomId(
                    id,
                    { deletedAt },
                    user.tenantId,
                  ),
                  deliveryOptionsRepository.updateByRoomId(
                    id,
                    { deletedAt },
                    user.tenantId,
                  ),
                  workflowsRepository.updateByRoomId(
                    id,
                    { deletedAt },
                    user.tenantId,
                  ),
                  productsRepository.updateByRoomId(
                    id,
                    { deletedAt, status: "draft" },
                    user.tenantId,
                  ),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0)), Effect.tap(notifyDelete)),
          ),
        });

        const restore = MutationsContract.makeMutation(RoomsContract.restore, {
          makePolicy: Effect.fn("Rooms.Mutations.restore.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("rooms:delete"),
                policies.canRestore.make({ id }),
              ),
          ),
          mutator: Effect.fn("Rooms.Mutations.restore.mutator")(
            ({ id }, user) =>
              Effect.all(
                Tuple.make(
                  repository
                    .updateById(id, { deletedAt: null }, user.tenantId)
                    .pipe(Effect.map(Struct.omit("version"))),
                  workflowsRepository.updateByRoomId(
                    id,
                    { deletedAt: null },
                    user.tenantId,
                  ),
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.getFirst), Effect.tap(notifyRestore)),
          ),
        });

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
