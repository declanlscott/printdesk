import {
  and,
  eq,
  getTableName,
  getViewName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect, Equal, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Replicache } from "../replicache2";
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
        const table = UsersSchema.table;
        const activeView = UsersSchema.activeView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const upsertMany = Effect.fn("Users.Repository.upsert")(
          (users: Array<InferInsertModel<UsersSchema.Table>>) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(users)
                .onConflictDoUpdate({
                  target: [table.id, table.tenantId],
                  set: buildConflictSet(table),
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Users.Repository.findActiveUpdates",
        )(
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

                    return tx.select(cte[getTableName(table)]).from(cte);
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

        const findActiveIdsByRoles = Effect.fn(
          "Users.Repository.findActiveIdsByRoles",
        )(
          (
            roles: ReadonlyArray<UsersSchema.Row["role"]>,
            tenantId: UsersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ id: activeView.id })
                  .from(activeView)
                  .where(
                    and(
                      inArray(activeView.role, roles),
                      eq(activeView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ id }) => id))),
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
          findActiveIdsByRoles,
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
      succeed: {
        isSelf: DataAccessContract.makePolicy(
          UsersContract.isSelf,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                Effect.succeed(Equal.equals(id, principal.userId)),
              ),
          }),
        ),
      },
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/users/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default, Policies.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isSelf = yield* Policies.isSelf;

        const update = DataAccessContract.makeMutation(
          UsersContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("users:update"),
            mutator: (user, session) =>
              repository
                .updateById(user.id, user, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          UsersContract.delete_,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.some(
                AccessControl.permission("users:delete"),
                isSelf.make({ id }),
              ),
            mutator: ({ id, deletedAt }, session) =>
              repository
                .updateById(id, { deletedAt }, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const restore = DataAccessContract.makeMutation(
          UsersContract.restore,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("users:delete"),
            mutator: ({ id }, session) =>
              repository
                .updateById(id, { deletedAt: null }, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        return { update, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
