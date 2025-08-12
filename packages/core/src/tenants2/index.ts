import { and, eq, getTableName, inArray, not, notInArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { identityProvidersTable } from "../identity-providers2/sql";
import { Replicache } from "../replicache2";
import { replicacheClientViewMetadataTable } from "../replicache2/sql";
import { LicensesContract, TenantsContract } from "./contracts";
import { licensesTable, tenantMetadataTable, tenantsTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { IdentityProvider } from "../identity-providers2/sql";
import type { ReplicacheClientViewMetadata } from "../replicache2/sql";
import type { License, Tenant, TenantMetadataTable, TenantsTable } from "./sql";

export namespace Tenants {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/tenants/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = tenantsTable;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

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

        const findCreates = Effect.fn("Tenants.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            id: Tenant["id"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                id,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(tx.select().from(table).where(eq(table.id, id)));

                    return tx
                      .select()
                      .from(cte)
                      .where(
                        inArray(
                          cte.id,
                          tx.select({ id: cte.id }).from(cte).except(qb),
                        ),
                      );
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn("Tenants.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            id: Tenant["id"],
          ) =>
            metadataQb.updates(getTableName(table), clientGroupId, id).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_updates`)
                    .as(
                      qb
                        .innerJoin(
                          table,
                          and(
                            eq(metadataTable.entityId, table.id),
                            not(eq(metadataTable.entityVersion, table.version)),
                            eq(metadataTable.tenantId, table.id),
                          ),
                        )
                        .where(eq(table.id, id)),
                    );

                  return tx.select(cte[getTableName(table)]).from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn("Tenants.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            id: Tenant["id"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                id,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.id, id)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn("Tenants.Repository.findFastForward")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            id: Tenant["id"],
            excludeIds: Array<Tenant["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                id,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_fast_forward`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.id, id)),
                      );

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
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
          findCreates,
          findUpdates,
          findDeletes,
          findFastForward,
          findById,
          findByIdentityProvider,
          findBySubdomain,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/tenants/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isSubdomainAvailable = yield* DataAccessContract.makePolicy(
          TenantsContract.isSubdomainAvailable,
          Effect.succeed({
            make: ({ subdomain }) =>
              AccessControl.policy(() =>
                Effect.gen(function* () {
                  if (["api", "auth", "backend", "www"].includes(subdomain))
                    return false;

                  return yield* repository.findBySubdomain(subdomain).pipe(
                    Effect.catchTag("NoSuchElementException", () =>
                      Effect.succeed(null),
                    ),
                    Effect.map(
                      (tenant) => !tenant || tenant.status === "setup",
                    ),
                  );
                }),
              ),
          }),
        );

        return { isSubdomainAvailable } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/tenants/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const update = DataAccessContract.makeMutation(
          TenantsContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("tenants:update"),
            mutator: (tenant, session) =>
              repository.updateById(session.tenantId, tenant),
          }),
        );

        return { update } as const;
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

  export class LicensePolicies extends Effect.Service<LicensePolicies>()(
    "@printdesk/core/tenants/LicensePolicies",
    {
      accessors: true,
      dependencies: [LicensesRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* LicensesRepository;

        const isAvailable = yield* DataAccessContract.makePolicy(
          LicensesContract.isAvailable,
          Effect.succeed({
            make: ({ key }) =>
              AccessControl.policy(() =>
                repository
                  .findByKeyWithTenant(key)
                  .pipe(
                    Effect.map(
                      ({ license, tenant }) =>
                        license.status === "active" &&
                        (license.tenantId === null ||
                          tenant?.status === "setup"),
                    ),
                  ),
              ),
          }),
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
