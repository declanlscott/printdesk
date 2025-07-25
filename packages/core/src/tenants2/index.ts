import { and, eq } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { identityProvidersTable } from "../identity-providers2/sql";
import { licensesTable, tenantMetadataTable, tenantsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { IdentityProvider } from "../identity-providers2/sql";
import type { License, Tenant, TenantMetadataTable, TenantsTable } from "./sql";

export namespace Tenants {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/tenants/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = tenantsTable;

        const upsert = Effect.fn("Tenants.Repository.upsert")(
          (tenant: InferInsertModel<TenantsTable>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(tenant)
                  .onConflictDoUpdate({
                    target: [table.id],
                    set: buildConflictSet(table),
                  })
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const getMetadata = Effect.fn("Tenants.Repository.getMetadata")(
          (id: Tenant["id"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.id, id)),
            ),
        );

        const findById = Effect.fn("Tenants.Repository.findById")(
          (id: Tenant["id"]) =>
            db
              .useTransaction((tx) =>
                tx.select().from(table).where(eq(table.id, id)),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIdentityProvider = Effect.fn(
          "Tenants.Repository.findByIdentityProvider",
        )((kind: IdentityProvider["kind"], id: IdentityProvider["id"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ tenant: table })
                .from(table)
                .innerJoin(
                  identityProvidersTable,
                  eq(identityProvidersTable.tenantId, table.id),
                )
                .where(
                  and(
                    eq(identityProvidersTable.kind, kind),
                    eq(identityProvidersTable.id, id),
                  ),
                ),
            )
            .pipe(
              Effect.map(Array.map(({ tenant }) => tenant)),
              Effect.flatMap(Array.head),
            ),
        );

        const findBySubdomain = Effect.fn("Tenants.Repository.findBySubdomain")(
          (subdomain: Tenant["subdomain"]) =>
            db
              .useTransaction((tx) =>
                tx.select().from(table).where(eq(table.subdomain, subdomain)),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateById = Effect.fn("Tenants.Repository.updateById")(
          (id: Tenant["id"], tenant: Partial<Omit<Tenant, "id">>) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(tenant)
                  .where(eq(table.id, id))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          upsert,
          getMetadata,
          findById,
          findByIdentityProvider,
          findBySubdomain,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/tenants/Policy",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isSubdomainAvailable = Effect.fn(
          "Tenants.Policy.isSubdomainAvailable",
        )((subdomain: Tenant["subdomain"]) =>
          AccessControl.policy(() =>
            Effect.gen(function* () {
              if (["api", "auth", "backend", "www"].includes(subdomain))
                return false;

              return yield* repository.findBySubdomain(subdomain).pipe(
                Effect.catchTag("NoSuchElementException", () =>
                  Effect.succeed(null),
                ),
                Effect.map((tenant) => !tenant || tenant.status === "setup"),
              );
            }),
          ),
        );

        return { isSubdomainAvailable } as const;
      }),
    },
  ) {}

  export class LicensesRepository extends Effect.Service<LicensesRepository>()(
    "@printdesk/core/tenants/LicensesRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = licensesTable;

        const findByKeyWithTenant = Effect.fn(
          "Tenants.LicensesRepository.findByKey",
        )((key: License["key"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({
                  license: table,
                  tenant: tenantsTable,
                })
                .from(table)
                .leftJoin(tenantsTable, eq(tenantsTable.id, table.tenantId))
                .where(eq(table.key, key)),
            )
            .pipe(Effect.flatMap(Array.head)),
        );

        const updateByKey = Effect.fn("Tenants.LicensesRepository.updateByKey")(
          (key: License["key"], license: Partial<Omit<License, "key">>) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(license)
                  .where(eq(table.key, key))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return { findByKeyWithTenant, updateByKey } as const;
      }),
    },
  ) {}

  export class LicensesPolicy extends Effect.Service<LicensesPolicy>()(
    "@printdesk/core/tenants/LicensesPolicy",
    {
      dependencies: [LicensesRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* LicensesRepository;

        const isAvailable = Effect.fn("Tenants.LicensesPolicy.isAvailable")(
          (key: License["key"]) =>
            AccessControl.policy(() =>
              repository
                .findByKeyWithTenant(key)
                .pipe(
                  Effect.map(
                    ({ license, tenant }) =>
                      license.status === "active" &&
                      (license.tenantId === null || tenant?.status === "setup"),
                  ),
                ),
            ),
        );

        return { isAvailable } as const;
      }),
    },
  ) {}

  export class MetadataRepository extends Effect.Service<MetadataRepository>()(
    "@printdesk/core/tenants/MetadataRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = tenantMetadataTable;

        const upsert = Effect.fn("Tenants.MetadataRepository.upsert")(
          (metadata: InferInsertModel<TenantMetadataTable>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(metadata)
                  .onConflictDoUpdate({
                    target: [table.tenantId],
                    set: buildConflictSet(table),
                  })
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByTenant = Effect.fn(
          "Tenants.MetadataRepository.findByTenant",
        )((tenantId: Tenant["id"]) =>
          db
            .useTransaction((tx) =>
              tx.select().from(table).where(eq(table.tenantId, tenantId)),
            )
            .pipe(Effect.flatMap(Array.head)),
        );

        return { upsert, findByTenant } as const;
      }),
    },
  ) {}
}
