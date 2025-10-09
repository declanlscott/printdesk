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

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { Events } from "../events2";
import { MutationsContract } from "../mutations/contract";
import { Permissions } from "../permissions2";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { Rooms } from "../rooms2";
import { AnnouncementsContract } from "./contract";
import { AnnouncementsSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Announcements {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/announcements/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = AnnouncementsSchema.table.definition;
        const activeView = AnnouncementsSchema.activeView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

        const create = Effect.fn("Announcements.Repository.create")(
          (announcement: InferInsertModel<AnnouncementsSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(announcement).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("Announcements.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.Row["tenantId"],
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
          "Announcements.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.ActiveRow["tenantId"],
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

        const findUpdates = Effect.fn("Announcements.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.Row["tenantId"],
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
          "Announcements.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.ActiveRow["tenantId"],
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

        const findDeletes = Effect.fn("Announcements.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.Row["tenantId"],
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
          "Announcements.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.ActiveRow["tenantId"],
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

        const findFastForward = Effect.fn(
          "Announcements.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.Row["tenantId"],
            excludeIds: Array<AnnouncementsSchema.Row["id"]>,
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
          "Announcements.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: AnnouncementsSchema.ActiveRow["tenantId"],
            excludeIds: Array<AnnouncementsSchema.ActiveRow["id"]>,
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

        const findById = Effect.fn("Announcements.Repository.findById")(
          (
            id: AnnouncementsSchema.Row["id"],
            tenantId: AnnouncementsSchema.Row["tenantId"],
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

        const updateById = Effect.fn("Announcements.Repository.updateById")(
          (
            id: AnnouncementsSchema.Row["id"],
            announcement: Partial<
              Omit<AnnouncementsSchema.Row, "id" | "tenantId">
            >,
            tenantId: AnnouncementsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(announcement)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateByRoomId = Effect.fn(
          "Announcements.Repository.updateByRoomId",
        )(
          (
            roomId: AnnouncementsSchema.Row["roomId"],
            announcement: Partial<
              Omit<AnnouncementsSchema.Row, "id" | "roomId" | "tenantId">
            >,
            tenantId: AnnouncementsSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set(announcement)
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
          findUpdates,
          findActiveUpdates,
          findDeletes,
          findActiveDeletes,
          findFastForward,
          findActiveFastForward,
          findById,
          updateById,
          updateByRoomId,
        };
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/announcements/Policies",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const canEdit = PoliciesContract.makePolicy(
          AnnouncementsContract.canEdit,
          {
            make: Effect.fn("Announcements.Policies.canEdit.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNull),
                  ),
              ),
            ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          AnnouncementsContract.canDelete,
          {
            make: Effect.fn("Announcements.Policies.canDelete.make")(
              canEdit.make,
            ),
          },
        );

        const canRestore = PoliciesContract.makePolicy(
          AnnouncementsContract.canRestore,
          {
            make: Effect.fn("Announcements.Policies.canRestore.make")(
              ({ id }) =>
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
    "@printdesk/core/announcements/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Rooms.Repository.Default,
        Policies.Default,
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const roomsRepository = yield* Rooms.Repository;

        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (
          announcement: AnnouncementsContract.DataTransferObject,
        ) =>
          roomsRepository
            .findById(announcement.roomId, announcement.tenantId)
            .pipe(
              Effect.map((room) =>
                Match.value(room).pipe(
                  Match.whenAnd(
                    { deletedAt: Match.null },
                    { status: Match.is("published") },
                    () =>
                      Array.make(
                        PullPermission.make({
                          permission: "announcements:read",
                        }),
                        PullPermission.make({
                          permission: "active_announcements:read",
                        }),
                        PullPermission.make({
                          permission:
                            "active_published_room_announcements:read",
                        }),
                      ),
                  ),
                  Match.orElse(() =>
                    Array.make(
                      PullPermission.make({
                        permission: "announcements:read",
                      }),
                      PullPermission.make({
                        permission: "active_announcements:read",
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
          AnnouncementsContract.create,
          {
            makePolicy: Effect.fn("Announcements.Mutations.create.makePolicy")(
              () => AccessControl.permission("announcements:create"),
            ),
            mutator: Effect.fn("Announcements.Mutations.create.mutator")(
              (announcement, session) =>
                repository
                  .create({
                    ...announcement,
                    authorId: session.userId,
                    tenantId: session.tenantId,
                  })
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyCreate),
                  ),
            ),
          },
        );

        const edit = MutationsContract.makeMutation(
          AnnouncementsContract.edit,
          {
            makePolicy: Effect.fn("Announcements.Mutations.edit.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("announcements:update"),
                  policies.canEdit.make({ id }),
                ),
            ),
            mutator: Effect.fn("Announcements.Mutations.edit.mutator")(
              ({ id, ...announcement }, session) =>
                repository
                  .updateById(id, announcement, session.tenantId)
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyEdit),
                  ),
            ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          AnnouncementsContract.delete_,
          {
            makePolicy: Effect.fn("Announcements.Mutations.delete.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("announcements:delete"),
                  policies.canDelete.make({ id }),
                ),
            ),
            mutator: Effect.fn("Announcements.Mutations.delete.mutator")(
              ({ id, deletedAt }, session) =>
                repository
                  .updateById(id, { deletedAt }, session.tenantId)
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyDelete),
                  ),
            ),
          },
        );

        const restore = MutationsContract.makeMutation(
          AnnouncementsContract.restore,
          {
            makePolicy: Effect.fn("Announcements.Mutations.restore.makePolicy")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.permission("announcements:delete"),
                  policies.canRestore.make({ id }),
                ),
            ),
            mutator: Effect.fn("Announcements.Mutations.restore.mutator")(
              ({ id }, session) =>
                repository
                  .updateById(id, { deletedAt: null }, session.tenantId)
                  .pipe(
                    Effect.map(Struct.omit("version")),
                    Effect.tap(notifyRestore),
                  ),
            ),
          },
        );

        return { create, edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
