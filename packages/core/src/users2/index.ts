import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Equal, Match, Predicate, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Events } from "../events2";
import { Permissions } from "../permissions2";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { UsersContract } from "./contract";
import { UsersSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { Prettify } from "../utils/types";

export namespace Users {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/users/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = UsersSchema.table.definition;
        const activeView = UsersSchema.activeView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

        const upsertMany = Effect.fn("Users.Repository.upsertMany")(
          (users: Array<InferInsertModel<UsersSchema.Table>>) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(users)
                .onConflictDoUpdate({
                  target: [table.id, table.tenantId],
                  set: UsersSchema.table.conflictSet,
                })
                .returning(),
            ),
        );

        const findCreates = Effect.fn("Users.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.Row["tenantId"],
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
          "Users.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.ActiveRow["tenantId"],
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

        const findUpdates = Effect.fn("Users.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.Row["tenantId"],
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
          "Users.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.ActiveRow["tenantId"],
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

        const findDeletes = Effect.fn("Users.Repository.finDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.Row["tenantId"],
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
          "Users.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.ActiveRow["tenantId"],
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

        const findFastForward = Effect.fn("Users.Repository.findFastForward")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.Row["tenantId"],
            excludeIds: Array<UsersSchema.Row["id"]>,
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
          "Users.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: UsersSchema.ActiveRow["tenantId"],
            excludeIds: Array<UsersSchema.ActiveRow["id"]>,
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

        const findById = Effect.fn("Users.Repository.findById")(
          (id: UsersSchema.Row["id"], tenantId: UsersSchema.Row["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByOrigin = Effect.fn("Users.Repository.findByOrigin")(
          <TUserOrigin extends UsersSchema.Row["origin"]>(
            origin: TUserOrigin,
            tenantId: UsersSchema.Row["tenantId"],
          ) =>
            db.useTransaction(
              (tx) =>
                tx
                  .select()
                  .from(table)
                  .where(
                    and(eq(table.origin, origin), eq(table.tenantId, tenantId)),
                  ) as unknown as Promise<
                  Array<Prettify<UsersSchema.RowByOrigin<TUserOrigin>>>
                >,
            ),
        );

        const findByIdentityProvider = Effect.fn(
          "Users.Repository.findByIdentityProvider",
        )(
          (
            subjectId: UsersSchema.Row["subjectId"],
            identityProviderId: UsersSchema.Row["identityProviderId"],
            tenantId: UsersSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(
                    eq(table.subjectId, subjectId),
                    eq(table.identityProviderId, identityProviderId),
                    eq(table.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const findByUsernames = Effect.fn("Users.Repository.findByUsernames")(
          (
            usernames: ReadonlyArray<UsersSchema.Row["username"]>,
            tenantId: UsersSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(
                    inArray(table.username, usernames),
                    eq(table.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const updateById = Effect.fn("Users.Repository.updateById")(
          (
            id: UsersSchema.Row["id"],
            user: Partial<Omit<UsersSchema.Row, "id" | "tenantId">>,
            tenantId: UsersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(user)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsertMany,
          findCreates,
          findActiveCreates,
          findUpdates,
          findActiveUpdates,
          findDeletes,
          findActiveDeletes,
          findFastForward,
          findActiveFastForward,
          findById,
          findByOrigin,
          findByIdentityProvider,
          findByUsernames,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/users/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isSelf = DataAccessContract.makePolicy(UsersContract.isSelf, {
          make: Effect.fn("Users.Policies.isSelf.make")(({ id }) =>
            AccessControl.policy((principal) =>
              Effect.succeed(Equal.equals(id, principal.userId)),
            ),
          ),
        });

        const canEdit = DataAccessContract.makePolicy(UsersContract.canEdit, {
          make: Effect.fn("Users.Policies.canEdit.make")(({ id }) =>
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
          UsersContract.canDelete,
          {
            make: Effect.fn("Users.Policies.canDelete.make")(canEdit.make),
          },
        );

        const canRestore = DataAccessContract.makePolicy(
          UsersContract.canRestore,
          {
            make: Effect.fn("Users.Policies.canRestore.make")(({ id }) =>
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

        return { isSelf, canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/users/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Policies.Default,
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyEdit = (user: UsersContract.DataTransferObject) =>
          Match.value(user).pipe(
            Match.when({ deletedAt: Match.null }, () =>
              Array.make(
                PullPermission.make({ permission: "users:read" }),
                PullPermission.make({ permission: "active_users:read" }),
              ),
            ),
            Match.orElse(() =>
              Array.make(PullPermission.make({ permission: "users:read" })),
            ),
            notifier.notify,
          );

        const notifyDelete = (_user: UsersContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "users:read" }),
              PullPermission.make({ permission: "active_users:read" }),
            ),
          );
        const notifyRestore = notifyDelete;

        const edit = DataAccessContract.makeMutation(UsersContract.edit, {
          makePolicy: Effect.fn("Users.Mutations.edit.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("users:update"),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Users.Mutations.edit.mutator")((user, session) =>
            repository
              .updateById(user.id, user, session.tenantId)
              .pipe(Effect.map(Struct.omit("version")), Effect.tap(notifyEdit)),
          ),
        });

        const delete_ = DataAccessContract.makeMutation(UsersContract.delete_, {
          makePolicy: Effect.fn("Users.Mutations.delete.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("users:delete"),
                policies.isSelf.make({ id }),
              ),
              policies.canDelete.make({ id }),
            ),
          ),
          mutator: Effect.fn("Users.Mutations.delete.mutator")(
            ({ id, deletedAt }, session) =>
              repository
                .updateById(id, { deletedAt }, session.tenantId)
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyDelete),
                ),
          ),
        });

        const restore = DataAccessContract.makeMutation(UsersContract.restore, {
          makePolicy: Effect.fn("Users.Mutations.restore.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("users:delete"),
                policies.canRestore.make({ id }),
              ),
          ),
          mutator: Effect.fn("Users.Mutations.restore.mutator")(
            ({ id }, session) =>
              repository
                .updateById(id, { deletedAt: null }, session.tenantId)
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyRestore),
                ),
          ),
        });

        return { edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
