import { and, eq, getTableColumns } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { IdentityProvidersRepository } from ".";
import { Database } from "../../database";
import { groupsTable } from "../../groups/sql";
import { tenantsTable } from "../../tenants/sql";
import { usersTable } from "../../users/sql";
import { identityProviders } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Tenant } from "../../tenants/sql";
import type { User } from "../../users/sql";
import type { IdentityProvider, IdentityProvidersTable } from "../sql";

export type ProvidersRepository = Effect.Success<typeof makeProvidersRepository>;

export const makeProvidersRepository = Effect.gen(function* () {
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

  const findByTenantId = Effect.fn("IdentityProviders.Repository.findByTenantId")(
    (tenantId: IdentityProvider["tenantId"]) =>
      db.useTransaction((tx) => tx.select().from(table).where(eq(table.tenantId, tenantId))),
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

  const findWithGroupByTenantId = Effect.fn(
    "IdentityProviders.Repository.findWithGroupsByTenantId",
  )((tenantId: IdentityProvider["tenantId"]) =>
    db.useTransaction((tx) =>
      tx
        .select({
          identityProvider: getTableColumns(table),
          group: getTableColumns(groupsTable),
        })
        .from(table)
        .leftJoin(
          groupsTable,
          and(
            eq(table.id, groupsTable.identityProviderId),
            eq(table.tenantId, groupsTable.tenantId),
          ),
        )
        .where(eq(table.tenantId, tenantId)),
    ),
  );

  const findWithTenantAndUserByExternalIds = Effect.fn(
    "IdentityProviders.Repository.findWithTenantAndUserByExternalIds",
  )(
    (
      idpKind: IdentityProvider["kind"],
      idpExternalId: IdentityProvider["externalId"],
      idpUserId: User["externalId"],
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
                eq(usersTable.externalId, idpUserId),
              ),
            )
            .where(and(eq(table.kind, idpKind), eq(table.externalId, idpExternalId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("IdentityProviders.Repository.updateById")(
    (
      id: IdentityProvider["id"],
      identityProvider: Partial<Omit<IdentityProvider, "id" | "tenantId" | "orgId" | "kind">>,
      tenantId: IdentityProvider["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(identityProvider)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
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
    findByTenantId,
    findByTenantSlug,
    findWithGroupByTenantId,
    findWithTenantAndUserByExternalIds,
    updateById,
    deleteByTenantId,
  } as const;
});

export const providersRepositoryLayer = makeProvidersRepository.pipe(
  Layer.effect(IdentityProvidersRepository),
);
