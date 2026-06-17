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

  const createMany = Effect.fn("IdentityProviders.Repository.createMany")(
    (values: Array.NonEmptyArray<InferInsertModel<IdentityProvidersTable>>) =>
      db.useTransaction((tx) => tx.insert(table).values(values).returning()),
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

  const findByTenantSlug = Effect.fn("IdentityProviders.Repository.findByTenantSlug")(
    (slug: Tenant["slug"]) =>
      db.useTransaction((tx) =>
        tx
          .select(getTableColumns(table))
          .from(tenantsTable)
          .innerJoin(table, eq(tenantsTable.id, table.tenantId))
          .where(eq(tenantsTable.slug, slug)),
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

  const deleteByTenantId = Effect.fn("IdentityProviders.Repository.deleteByTenantId")(
    (tenantId: IdentityProvider["tenantId"]) =>
      db
        .useTransaction((tx) => tx.delete(table).where(eq(table.tenantId, tenantId)))
        .pipe(Effect.asVoid),
  );

  return {
    createMany,
    findAll,
    findById,
    findByTenantSlug,
    findWithTenantAndUserByExternalIds,
    deleteByTenantId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(IdentityProvidersRepository));
