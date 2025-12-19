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
import { UsersContract } from "./contract";
import { UsersSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache/schemas";
import type { Prettify } from "../utils";

export namespace Users {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/users/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = UsersSchema.table.definition;
        const activeView = UsersSchema.activeView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn("Users.Repository.create")(
          (user: InferInsertModel<UsersSchema.Table>) =>
            db
              .useTransaction((tx) => tx.insert(table).values(user).returning())
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const upsertMany = Effect.fn("Users.Repository.upsertMany")(
          (users: Array.NonEmptyArray<InferInsertModel<UsersSchema.Table>>) =>
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
          "Users.Repository.findActiveCreates",
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

        const findUpdates = Effect.fn("Users.Repository.findUpdates")(
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
          "Users.Repository.findActiveUpdates",
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

        const findDeletes = Effect.fn("Users.Repository.finDeletes")(
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
          "Users.Repository.findActiveDeletes",
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

        const findFastForward = Effect.fn("Users.Repository.findFastForward")(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<UsersSchema.Row["id"]>,
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
          "Users.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<UsersSchema.ActiveRow["id"]>,
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
          create,
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
          findByUsernames,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/users/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(UsersSchema.table.definition),
          )
            .query(AccessControl.permission("users:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_users:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .build();

        return { differenceResolver } as const;
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

        const isSelf = PoliciesContract.makePolicy(UsersContract.isSelf, {
          make: Effect.fn("Users.Policies.isSelf.make")(({ id }) =>
            AccessControl.userPolicy((user) => Effect.succeed(id === user.id)),
          ),
        });

        const canEdit = PoliciesContract.makePolicy(UsersContract.canEdit, {
          make: Effect.fn("Users.Policies.canEdit.make")(({ id }) =>
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

        const canDelete = PoliciesContract.makePolicy(UsersContract.canDelete, {
          make: Effect.fn("Users.Policies.canDelete.make")(canEdit.make),
        });

        const canRestore = PoliciesContract.makePolicy(
          UsersContract.canRestore,
          {
            make: Effect.fn("Users.Policies.canRestore.make")(({ id }) =>
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

        return { isSelf, canEdit, canDelete, canRestore } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/users/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default, Policies.Default],
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

        const edit = MutationsContract.makeMutation(UsersContract.edit, {
          makePolicy: Effect.fn("Users.Mutations.edit.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.permission("users:update"),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Users.Mutations.edit.mutator")(
            (user, { tenantId }) =>
              repository
                .updateById(user.id, user, tenantId)
                .pipe(Effect.tap(notifyEdit)),
          ),
        });

        const delete_ = MutationsContract.makeMutation(UsersContract.delete_, {
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
            ({ id, deletedAt }, { tenantId }) =>
              repository
                .updateById(id, { deletedAt }, tenantId)
                .pipe(Effect.tap(notifyDelete)),
          ),
        });

        const restore = MutationsContract.makeMutation(UsersContract.restore, {
          makePolicy: Effect.fn("Users.Mutations.restore.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("users:delete"),
                policies.canRestore.make({ id }),
              ),
          ),
          mutator: Effect.fn("Users.Mutations.restore.mutator")(
            ({ id }, { tenantId }) =>
              repository
                .updateById(id, { deletedAt: null }, tenantId)
                .pipe(Effect.tap(notifyRestore)),
          ),
        });

        return { edit, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
