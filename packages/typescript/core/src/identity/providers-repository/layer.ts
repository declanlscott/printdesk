import { and, eq, getTableColumns } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { IdentityProvidersRepository } from ".";
import { Database } from "../../database";
import { tenantsTable } from "../../tenants/sql";
import { usersTable } from "../../users/sql";
import { identityProviders } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Tenant } from "../../tenants/sql";
import type { User } from "../../users/sql";
import type { IdentityProvider, IdentityProvidersTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = identityProviders.table;

  const upsert = Effect.fn("IdentityProviders.Repository.upsert")(
    (value: InferInsertModel<IdentityProvidersTable>) =>
      db
        .useTransaction((tx) =>
          tx
            .insert(table)
            .values(value)
            .onConflictDoUpdate({
              target: [table.id, table.tenantId],
              set: identityProviders.conflictSet,
            })
            .returning(),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findAll = Effect.fn("IdentityProviders.Repository.findAll")(
    (tenantId: IdentityProvider["tenantId"]) =>
      db.useTransaction((tx) => tx.select().from(table).where(eq(table.tenantId, tenantId))),
  );

  const findById = Effect.fn("IdentityProviders.Repository.findById")(
    (id: IdentityProvider["id"], tenantId: IdentityProvider["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findBySubdomain = Effect.fn("IdentityProviders.Repository.findBySubdomain")(
    (subdomain: Tenant["subdomain"]) =>
      db.useTransaction((tx) =>
        tx
          .select(getTableColumns(table))
          .from(tenantsTable)
          .innerJoin(table, eq(tenantsTable.id, table.tenantId))
          .where(eq(tenantsTable.subdomain, subdomain)),
      ),
  );

  const findWithTenantAndUserByExternalIds = Effect.fn(
    "IdentityProviders.Repository.findWithTenantAndUserByExternalIds",
  )(
    (
      kind: IdentityProvider["kind"],
      externalTenantId: IdentityProvider["externalTenantId"],
      externalUserId: User["externalId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              identityProvider: getTableColumns(table),
              tenant: getTableColumns(tenantsTable),
              user: getTableColumns(usersTable),
            })
            .from(table)
            .innerJoin(tenantsTable, eq(table.tenantId, tenantsTable.id))
            .leftJoin(
              usersTable,
              and(
                eq(table.id, usersTable.identityProviderId),
                eq(table.tenantId, usersTable.tenantId),
                eq(usersTable.externalId, externalUserId),
              ),
            )
            .where(and(eq(table.kind, kind), eq(table.externalTenantId, externalTenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    upsert,
    findAll,
    findById,
    findBySubdomain,
    findWithTenantAndUserByExternalIds,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(IdentityProvidersRepository));
