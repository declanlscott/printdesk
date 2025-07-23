import { and, eq } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import { buildConflictSet } from "../database2/columns";
import { tenantsTable } from "../tenants2/sql";
import { identityProvidersTable, identityProviderUserGroupsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Tenant } from "../tenants2/sql";
import type {
  IdentityProvider,
  IdentityProvidersTable,
  IdentityProviderUserGroup,
  IdentityProviderUserGroupsTable,
} from "./sql";

export namespace IdentityProviders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/identity-providers/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = identityProvidersTable;

        const upsert = Effect.fn("IdentityProviders.Repository.upsert")(
          (identityProvider: InferInsertModel<IdentityProvidersTable>) =>
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
          (tenantId: IdentityProvider["tenantId"]) =>
            db.useTransaction((tx) =>
              tx.select().from(table).where(eq(table.tenantId, tenantId)),
            ),
        );

        const findById = Effect.fn("IdentityProviders.Repository.findById")(
          (
            id: IdentityProvider["id"],
            tenantId: IdentityProvider["tenantId"],
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
        )((subdomain: Tenant["subdomain"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ identityProvider: table })
                .from(tenantsTable)
                .innerJoin(table, eq(tenantsTable.id, table.tenantId))
                .where(eq(tenantsTable.subdomain, subdomain)),
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
        const table = identityProviderUserGroupsTable;

        const create = Effect.fn(
          "IdentityProviders.UserGroupsRepository.create",
        )(
          (
            identityProviderUserGroup: InferInsertModel<IdentityProviderUserGroupsTable>,
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
            identityProviderId: IdentityProvider["id"],
            tenantId: IdentityProvider["tenantId"],
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
            id: IdentityProviderUserGroupsTable["id"],
            identityProviderId: IdentityProviderUserGroup["identityProviderId"],
            tenantId: IdentityProviderUserGroup["tenantId"],
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
