import { and, eq } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { TenantsSchema } from "../tenants2/schemas";
import {
  IdentityProvidersSchema,
  IdentityProviderUserGroupsSchema,
} from "./schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace IdentityProviders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/identity-providers/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = IdentityProvidersSchema.table;

        const upsert = Effect.fn("IdentityProviders.Repository.upsert")(
          (identityProvider: InferInsertModel<IdentityProvidersSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(identityProvider)
                  .onConflictDoUpdate({
                    target: [table.id, table.tenantId],
                    set: buildConflictSet(table),
                  })
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findAll = Effect.fn("IdentityProviders.Repository.findAll")(
          (tenantId: IdentityProvidersSchema.Row["tenantId"]) =>
            db.useTransaction((tx) =>
              tx.select().from(table).where(eq(table.tenantId, tenantId)),
            ),
        );

        const findById = Effect.fn("IdentityProviders.Repository.findById")(
          (
            id: IdentityProvidersSchema.Row["id"],
            tenantId: IdentityProvidersSchema.Row["tenantId"],
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

        const findBySubdomain = Effect.fn(
          "IdentityProviders.Repository.findBySubdomain",
        )((subdomain: TenantsSchema.Row["subdomain"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ identityProvider: table })
                .from(TenantsSchema.table)
                .innerJoin(table, eq(TenantsSchema.table.id, table.tenantId))
                .where(eq(TenantsSchema.table.subdomain, subdomain)),
            )
            .pipe(
              Effect.map(Array.map(({ identityProvider }) => identityProvider)),
            ),
        );

        return { upsert, findAll, findById, findBySubdomain } as const;
      }),
    },
  ) {}

  export class UserGroupsRepository extends Effect.Service<UserGroupsRepository>()(
    "@printdesk/core/identity-providers/UserGroupsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = IdentityProviderUserGroupsSchema.table;

        const create = Effect.fn(
          "IdentityProviders.UserGroupsRepository.create",
        )(
          (
            identityProviderUserGroup: InferInsertModel<IdentityProviderUserGroupsSchema.Table>,
          ) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(identityProviderUserGroup).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findByIdentityProvider = Effect.fn(
          "IdentityProviders.UserGroupsRepository.findByIdentityProvider",
        )(
          (
            identityProviderId: IdentityProviderUserGroupsSchema.Row["identityProviderId"],
            tenantId: IdentityProviderUserGroupsSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(
                    eq(table.identityProviderId, identityProviderId),
                    eq(table.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const deleteById = Effect.fn(
          "IdentityProviders.UserGroupsRepository.deleteById",
        )(
          (
            id: IdentityProviderUserGroupsSchema.Row["id"],
            identityProviderId: IdentityProviderUserGroupsSchema.Row["identityProviderId"],
            tenantId: IdentityProviderUserGroupsSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .delete(table)
                .where(
                  and(
                    eq(table.id, id),
                    eq(table.identityProviderId, identityProviderId),
                    eq(table.tenantId, tenantId),
                  ),
                ),
            ),
        );

        return { create, findByIdentityProvider, deleteById } as const;
      }),
    },
  ) {}
}
