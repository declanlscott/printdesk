import { and, eq, getTableColumns } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";

import { Database } from "../database2";
import { TenantsSchema } from "../tenants2/schemas";
import {
  IdentityProvidersSchema,
  IdentityProviderUserGroupsSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";

export namespace IdentityProviders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/identity-providers/Repository",
    {
      accessors: true,
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = IdentityProvidersSchema.table.definition;

        const upsert = Effect.fn("IdentityProviders.Repository.upsert")(
          (identityProvider: InferInsertModel<IdentityProvidersSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(identityProvider)
                  .onConflictDoUpdate({
                    target: [table.id, table.tenantId],
                    set: IdentityProvidersSchema.table.conflictSet,
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
          db.useTransaction((tx) =>
            tx
              .select(getTableColumns(table))
              .from(TenantsSchema.table.definition)
              .innerJoin(
                table,
                eq(TenantsSchema.table.definition.id, table.tenantId),
              )
              .where(eq(TenantsSchema.table.definition.subdomain, subdomain)),
          ),
        );

        return { upsert, findAll, findById, findBySubdomain } as const;
      }),
    },
  ) {}

  export class UserGroupsRepository extends Effect.Service<UserGroupsRepository>()(
    "@printdesk/core/identity-providers/UserGroupsRepository",
    {
      accessors: true,
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = IdentityProviderUserGroupsSchema.table.definition;

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
