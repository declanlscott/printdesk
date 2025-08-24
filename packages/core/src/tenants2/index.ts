import { and, eq, getTableName, inArray, not, notInArray } from "drizzle-orm";
import { Array, Effect, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { TableContract } from "../database2/contract";
import { IdentityProvidersSchema } from "../identity-providers2/schema";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { LicensesContract, TenantsContract } from "./contracts";
import { LicensesSchema, TenantMetadataSchema, TenantsSchema } from "./schemas";

import type { InferInsertModel } from "drizzle-orm";

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
        const table = TenantsSchema.table;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const upsert = Effect.fn("Tenants.Repository.upsert")(
          (tenant: InferInsertModel<TenantsSchema.Table>) =>
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            id: TenantsSchema.Row["id"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                TableContract.TenantId.make(id),
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            id: TenantsSchema.Row["id"],
          ) =>
            metadataQb
              .updates(
                getTableName(table),
                clientGroupId,
                TableContract.TenantId.make(id),
              )
              .pipe(
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
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            id: TenantsSchema.Row["id"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                TableContract.TenantId.make(id),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            id: TenantsSchema.Row["id"],
            excludeIds: Array<TenantsSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                TableContract.TenantId.make(id),
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
          (id: TenantsSchema.Row["id"]) =>
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
            kind: IdentityProvidersSchema.Row["kind"],
            id: IdentityProvidersSchema.Row["id"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ tenant: table })
                  .from(table)
                  .innerJoin(
                    IdentityProvidersSchema.table,
                    eq(IdentityProvidersSchema.table.tenantId, table.id),
                  )
                  .where(
                    and(
                      eq(IdentityProvidersSchema.table.kind, kind),
                      eq(IdentityProvidersSchema.table.id, id),
                    ),
                  ),
              )
              .pipe(
                Effect.map(Array.map(({ tenant }) => tenant)),
                Effect.flatMap(Array.head),
              ),
        );

        const findBySubdomain = Effect.fn("Tenants.Repository.findBySubdomain")(
          (subdomain: TenantsSchema.Row["subdomain"]) =>
            db
              .useTransaction((tx) =>
                tx.select().from(table).where(eq(table.subdomain, subdomain)),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateById = Effect.fn("Tenants.Repository.updateById")(
          (
            id: TenantsSchema.Row["id"],
            tenant: Partial<Omit<TenantsSchema.Row, "id">>,
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

        const isSubdomainAvailable = DataAccessContract.makePolicy(
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
                    Effect.map((tenant) => tenant?.status === "setup"),
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
              repository
                .updateById(session.tenantId, tenant)
                .pipe(Effect.map(Struct.omit("version"))),
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
        const table = LicensesSchema.table;

        const findByKeyWithTenant = Effect.fn(
          "Tenants.LicensesRepository.findByKey",
        )((key: LicensesSchema.Row["key"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({
                  license: table,
                  tenant: TenantsSchema.table,
                })
                .from(table)
                .leftJoin(
                  TenantsSchema.table,
                  eq(TenantsSchema.table.id, table.tenantId),
                )
                .where(eq(table.key, key)),
            )
            .pipe(Effect.flatMap(Array.head)),
        );

        const updateByKey = Effect.fn("Tenants.LicensesRepository.updateByKey")(
          (
            key: LicensesSchema.Row["key"],
            license: Partial<Omit<LicensesSchema.Row, "key">>,
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

  export class LicensePolicies extends Effect.Service<LicensePolicies>()(
    "@printdesk/core/tenants/LicensePolicies",
    {
      accessors: true,
      dependencies: [LicensesRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* LicensesRepository;

        const isAvailable = DataAccessContract.makePolicy(
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
        const table = TenantMetadataSchema.table;

        const upsert = Effect.fn("Tenants.MetadataRepository.upsert")(
          (metadata: InferInsertModel<TenantMetadataSchema.Table>) =>
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
        )((tenantId: TenantsSchema.Row["id"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  eq(table.tenantId, TableContract.TenantId.make(tenantId)),
                ),
            )
            .pipe(Effect.flatMap(Array.head)),
        );

        return { upsert, findByTenant } as const;
      }),
    },
  ) {}
}
