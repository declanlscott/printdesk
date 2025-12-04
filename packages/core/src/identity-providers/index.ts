import { and, eq, getTableColumns } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";

import { Database } from "../database";
import { TenantsSchema } from "../tenants/schemas";
import { UsersSchema } from "../users/schema";
import { IdentityProvidersSchema } from "./schema";

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

        const findWithTenantAndUserByExternalIds = Effect.fn(
          "IdentityProviders.Repository.findWithTenantAndUserByExternalIds",
        )(
          (
            kind: IdentityProvidersSchema.Row["kind"],
            externalTenantId: IdentityProvidersSchema.Row["externalTenantId"],
            externalUserId: UsersSchema.Row["externalId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    identityProvider: getTableColumns(table),
                    tenant: getTableColumns(TenantsSchema.table.definition),
                    user: getTableColumns(UsersSchema.table.definition),
                  })
                  .from(table)
                  .innerJoin(
                    TenantsSchema.table.definition,
                    eq(table.tenantId, TenantsSchema.table.definition.id),
                  )
                  .leftJoin(
                    UsersSchema.table.definition,
                    and(
                      eq(
                        table.id,
                        UsersSchema.table.definition.identityProviderId,
                      ),
                      eq(table.tenantId, UsersSchema.table.definition.tenantId),
                      eq(
                        UsersSchema.table.definition.externalId,
                        externalUserId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(table.kind, kind),
                      eq(table.externalTenantId, externalTenantId),
                    ),
                  ),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsert,
          findAll,
          findById,
          findBySubdomain,
          findWithTenantAndUserByExternalIds,
        } as const;
      }),
    },
  ) {}
}
