import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Match, Predicate, Struct, Tuple } from "effect";

import { AccessControl } from "../access-control2";
import { Announcements } from "../announcements2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { DeliveryOptions } from "../delivery-options2";
import { Events } from "../events2";
import { Permissions } from "../permissions2";
import { Products } from "../products2";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { RoomWorkflows } from "../workflows2";
import { RoomsContract } from "./contract";
import { RoomsSchema } from "./schema";

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
        const table = RoomsSchema.table.definition;
        const activeView = RoomsSchema.activeView;
        const activePublishedView = RoomsSchema.activePublishedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
                      .with(cte)
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

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/rooms/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const canEdit = DataAccessContract.makePolicy(RoomsContract.canEdit, {
          make: Effect.fn("Rooms.Policies.canEdit.make")(({ id }) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map(Struct.get("deletedAt")),
                  Effect.map(Predicate.isNull),
                ),
            ),
          ),
        });

        const canDelete = DataAccessContract.makePolicy(
          RoomsContract.canDelete,
          { make: Effect.fn("Rooms.Policies.canDelete.make")(canEdit.make) },
        );

        const canRestore = DataAccessContract.makePolicy(
          RoomsContract.canRestore,
          {
            make: Effect.fn("Rooms.Policies.canRestore.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
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
        Permissions.Schemas.Default,
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

        const create = DataAccessContract.makeMutation(RoomsContract.create, {
          makePolicy: Effect.fn("Rooms.Mutations.create.makePolicy")(() =>
            AccessControl.permission("rooms:create"),
          ),
          mutator: Effect.fn("Rooms.Mutations.create.mutator")(
            ({ workflowId, ...room }, { tenantId }) =>
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
              ).pipe(Effect.map(Tuple.at(0)), Effect.tap(notifyCreate)),
          ),
        });

        const edit = DataAccessContract.makeMutation(RoomsContract.edit, {
          makePolicy: Effect.fn("Rooms.Mutations.edit.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Rooms.Mutations.edit.mutator")(
            ({ id, ...room }, session) =>
              repository
                .updateById(id, room, session.tenantId)
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyEdit),
                ),
          ),
        });

        const publish = DataAccessContract.makeMutation(RoomsContract.publish, {
          makePolicy: Effect.fn("Rooms.Mutations.publish.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("rooms:update"),
                policies.canEdit.make({ id }),
              ),
          ),
          mutator: Effect.fn("Rooms.Mutations.publish.mutator")(
            ({ id, updatedAt }, session) =>
              repository
                .updateById(
                  id,
                  { status: "published", updatedAt },
                  session.tenantId,
                )
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyPublish),
                ),
          ),
        });

        const draft = DataAccessContract.makeMutation(RoomsContract.draft, {
          makePolicy: Effect.fn("Rooms.Mutations.draft.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:update"),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Rooms.Mutations.draft.mutator")(
            ({ id, updatedAt }, session) =>
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
              ).pipe(Effect.map(Tuple.at(0)), Effect.tap(notifyDraft)),
          ),
        });

        const delete_ = DataAccessContract.makeMutation(RoomsContract.delete_, {
          makePolicy: Effect.fn("Rooms.Mutations.delete.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("rooms:delete"),
              policies.canDelete.make({ id }),
            ),
          ),
          mutator: Effect.fn("Rooms.Mutations.delete.mutator")(
            ({ id, deletedAt }, session) =>
              Effect.all(
                Tuple.make(
                  repository
                    .updateById(
                      id,
                      { deletedAt, status: "draft" },
                      session.tenantId,
                    )
                    .pipe(Effect.map(Struct.omit("version"))),
                  announcementsRepository.updateByRoomId(
                    id,
                    { deletedAt },
                    session.tenantId,
                  ),
                  deliveryOptionsRepository.updateByRoomId(
                    id,
                    { deletedAt },
                    session.tenantId,
                  ),
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
              ).pipe(Effect.map(Tuple.at(0)), Effect.tap(notifyDelete)),
          ),
        });

        const restore = DataAccessContract.makeMutation(RoomsContract.restore, {
          makePolicy: Effect.fn("Rooms.Mutations.restore.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("rooms:delete"),
                policies.canRestore.make({ id }),
              ),
          ),
          mutator: Effect.fn("Rooms.Mutations.restore.mutator")(
            ({ id }, session) =>
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
                ),
                { concurrency: "unbounded" },
              ).pipe(Effect.map(Tuple.at(0)), Effect.tap(notifyRestore)),
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
