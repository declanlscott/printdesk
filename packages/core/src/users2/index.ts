import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Sync } from "../sync2";
import { deleteUser, restoreUser, updateUser } from "./shared";
import { activeUsersView, usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Prettify } from "../utils/types";
import type { User, UserByOrigin, UsersTable } from "./sql";

export namespace Users {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/users/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = usersTable;
        const activeView = activeUsersView;

        const upsertMany = Effect.fn("Users.Repository.upsert")(
          (users: Array<InferInsertModel<UsersTable>>) =>
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

        const getMetadata = Effect.fn("Users.Repository.getMetadata")(
          (tenantId: User["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Users.Repository.getActiveMetadata",
        )((tenantId: User["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const findById = Effect.fn("Users.Repository.findById")(
          (id: User["id"], tenantId: User["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIds = Effect.fn("Users.Repository.findByIds")(
          (ids: ReadonlyArray<User["id"]>, tenantId: User["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const findActiveIdsByRoles = Effect.fn(
          "Users.Repository.findActiveIdsByRoles",
        )((roles: ReadonlyArray<User["role"]>, tenantId: User["tenantId"]) =>
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
          <TUserOrigin extends User["origin"]>(
            origin: TUserOrigin,
            tenantId: User["tenantId"],
          ) =>
            db.useTransaction(
              (tx) =>
                tx
                  .select()
                  .from(table)
                  .where(
                    and(eq(table.origin, origin), eq(table.tenantId, tenantId)),
                  ) as unknown as Promise<
                  Array<Prettify<UserByOrigin<TUserOrigin>>>
                >,
            ),
        );

        const findByIdentityProvider = Effect.fn(
          "Users.Repository.findByIdentityProvider",
        )(
          (
            subjectId: User["subjectId"],
            identityProviderId: User["identityProviderId"],
            tenantId: User["tenantId"],
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
            usernames: ReadonlyArray<User["username"]>,
            tenantId: User["tenantId"],
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
            id: User["id"],
            user: Partial<Omit<User, "id" | "tenantId">>,
            tenantId: User["tenantId"],
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

        const deleteById = Effect.fn("Users.Repository.deleteById")(
          (
            id: User["id"],
            deletedAt: NonNullable<User["deletedAt"]>,
            tenantId: User["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsertMany,
          getMetadata,
          getActiveMetadata,
          findById,
          findByIds,
          findActiveIdsByRoles,
          findByOrigin,
          findByIdentityProvider,
          findByUsernames,
          updateById,
          deleteById,
        } as const;
      }),
    },
  ) {}

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/users/Policy",
    {
      succeed: {
        isSelf: (id: User["id"]) =>
          AccessControl.policy((principal) =>
            Effect.succeed(id === principal.userId),
          ),
      } as const,
    },
  ) {}

  export class SyncMutations extends Effect.Service<SyncMutations>()(
    "@printdesk/core/users/SyncMutations",
    {
      dependencies: [Policy.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const policy = yield* Policy;

        const update = Sync.Mutation(
          updateUser,
          () => AccessControl.permission("users:update"),
          ({ id, ...user }, session) =>
            repository.updateById(id, user, session.tenantId),
        );

        const delete_ = Sync.Mutation(
          deleteUser,
          ({ id }) =>
            AccessControl.some(
              AccessControl.permission("users:delete"),
              policy.isSelf(id),
            ),
          ({ id, deletedAt }, session) =>
            repository.deleteById(id, deletedAt, session.tenantId),
        );

        const restore = Sync.Mutation(
          restoreUser,
          () => AccessControl.permission("users:delete"),
          ({ id }, session) =>
            repository.updateById(id, { deletedAt: null }, session.tenantId),
        );

        return { update, delete: delete_, restore } as const;
      }),
    },
  ) {}
}
