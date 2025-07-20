import { and, eq } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Tenants {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/tenants/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.tenantsTable.table;

        const upsert = Effect.fn("Tenants.Repository.upsert")(
          (tenant: InferInsertModel<schema.TenantsTable>) =>
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
          (tenantId: schema.Tenant["id"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.id, tenantId)),
            ),
        );

        const findById = Effect.fn("Tenants.Repository.findById")(
          (id: schema.Tenant["id"]) =>
            db
              .useTransaction((tx) =>
                tx.select().from(table).where(eq(table.id, id)),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIdentityProvider = Effect.fn(
          "Tenants.Repository.findByIdentityProvider",
        )(
          (
            kind: schema.IdentityProvider["kind"],
            id: schema.IdentityProvider["id"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ tenant: table })
                  .from(table)
                  .innerJoin(
                    schema.identityProvidersTable.table,
                    eq(schema.identityProvidersTable.table.tenantId, table.id),
                  )
                  .where(
                    and(
                      eq(schema.identityProvidersTable.table.kind, kind),
                      eq(schema.identityProvidersTable.table.id, id),
                    ),
                  ),
              )
              .pipe(
                Effect.map(Array.map(({ tenant }) => tenant)),
                Effect.flatMap(Array.head),
              ),
        );

        const findBySubdomain = Effect.fn("Tenants.Repository.findBySubdomain")(
          (subdomain: schema.Tenant["subdomain"]) =>
            db
              .useTransaction((tx) =>
                tx.select().from(table).where(eq(table.subdomain, subdomain)),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateById = Effect.fn("Tenants.Repository.updateById")(
          (
            id: schema.Tenant["id"],
            tenant: Partial<Omit<schema.Tenant, "id">>,
          ) =>
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
        )((subdomain: schema.Tenant["subdomain"]) =>
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
        const table = schema.licensesTable.table;

        const findByKeyWithTenant = Effect.fn(
          "Tenants.LicensesRepository.findByKey",
        )((key: schema.License["key"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({
                  license: table,
                  tenant: schema.tenantsTable.table,
                })
                .from(table)
                .leftJoin(
                  schema.tenantsTable.table,
                  eq(schema.tenantsTable.table.id, table.tenantId),
                )
                .where(eq(table.key, key)),
            )
            .pipe(Effect.flatMap(Array.head)),
        );

        const updateByKey = Effect.fn("Tenants.LicensesRepository.updateByKey")(
          (
            key: schema.License["key"],
            license: Partial<Omit<schema.License, "key">>,
          ) =>
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
          (key: schema.License["key"]) =>
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
        const table = schema.tenantMetadataTable.table;

        const upsert = Effect.fn("Tenants.MetadataRepository.upsert")(
          (metadata: InferInsertModel<schema.TenantMetadataTable>) =>
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
        )((tenantId: schema.Tenant["id"]) =>
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
