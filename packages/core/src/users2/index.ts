import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept, Prettify } from "../utils/types";

export namespace Users {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/users/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.usersTable.table;

        const upsertMany = Effect.fn("Users.Repository.upsert")(
          (users: Array<InferInsertModel<schema.UsersTable>>) =>
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

        const findById = Effect.fn("Users.Repository.findById")(
          (id: schema.User["id"], tenantId: schema.User["tenantId"]) =>
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
          (
            ids: ReadonlyArray<schema.User["id"]>,
            tenantId: schema.User["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const findByRoles = Effect.fn("Users.Repository.findByRoles")(
          (
            roles: ReadonlyArray<schema.User["role"]>,
            tenantId: schema.User["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.role, roles), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const findByOrigin = Effect.fn("Users.Repository.findByOrigin")(
          <TUserOrigin extends schema.User["origin"]>(
            origin: TUserOrigin,
            tenantId: schema.User["tenantId"],
          ) =>
            db.useTransaction(
              (tx) =>
                tx
                  .select()
                  .from(table)
                  .where(
                    and(eq(table.origin, origin), eq(table.tenantId, tenantId)),
                  ) as unknown as Promise<
                  Array<Prettify<schema.UserByOrigin<TUserOrigin>>>
                >,
            ),
        );

        const findByIdentityProvider = Effect.fn(
          "Users.Repository.findByIdentityProvider",
        )(
          (
            subjectId: schema.User["subjectId"],
            identityProviderId: schema.User["identityProviderId"],
            tenantId: schema.User["tenantId"],
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
            usernames: ReadonlyArray<schema.User["username"]>,
            tenantId: schema.User["tenantId"],
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

        const update = Effect.fn("Users.Repository.update")(
          (user: PartialExcept<schema.User, "id" | "tenantId">) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(user)
                  .where(
                    and(
                      eq(table.id, user.id),
                      eq(table.tenantId, user.tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const delete_ = Effect.fn("Users.Repository.delete")(
          (
            id: schema.User["id"],
            deletedAt: schema.User["deletedAt"],
            tenantId: schema.User["tenantId"],
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
          findById,
          findByIds,
          findByRoles,
          findByOrigin,
          findByIdentityProvider,
          findByUsernames,
          update,
          delete: delete_,
        } as const;
      }),
    },
  ) {}

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/users/Policy",
    {
      succeed: {
        isSelf: (id: schema.User["id"]) =>
          AccessControl.policy((principal) =>
            Effect.succeed(id === principal.userId),
          ),
      } as const,
    },
  ) {}
}
