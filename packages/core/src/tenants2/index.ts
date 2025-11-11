import {
  and,
  eq,
  getTableColumns,
  getTableName,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control2";
import { ColumnsContract } from "../columns2/contract";
import { Database } from "../database2";
import { Events } from "../events2";
import { IdentityProvidersSchema } from "../identity-providers2/schemas";
import { MutationsContract } from "../mutations/contract";
import { Permissions } from "../permissions2";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache2/schemas";
import { LicensesContract, TenantsContract } from "./contracts";
import { LicensesSchema, TenantMetadataSchema, TenantsSchema } from "./schemas";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache2/schemas";

export namespace Tenants {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/tenants/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = TenantsSchema.table.definition;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const upsert = Effect.fn("Tenants.Repository.upsert")(
          (tenant: InferInsertModel<TenantsSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(tenant)
                  .onConflictDoUpdate({
                    target: [table.id],
                    set: TenantsSchema.table.conflictSet,
                  })
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findCreates = Effect.fn("Tenants.Repository.findCreates")(
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_creates`)
                    .as(
                      tx
                        .select()
                        .from(table)
                        .where(eq(table.id, clientView.tenantId)),
                    );

                  return tx
                    .with(cte)
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
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(`${getTableName(table)}_updates`)
                    .as(
                      qb
                        .innerJoin(
                          table,
                          and(
                            eq(entriesTable.entityId, table.id),
                            not(eq(entriesTable.entityVersion, table.version)),
                            eq(entriesTable.tenantId, table.id),
                          ),
                        )
                        .where(eq(table.id, clientView.tenantId)),
                    );

                  return tx
                    .with(cte)
                    .select(cte[getTableName(table)])
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn("Tenants.Repository.findDeletes")(
          (clientView: ReplicacheClientViewsSchema.Row) =>
            entriesQueryBuilder
              .deletes(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.id, clientView.tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn("Tenants.Repository.findFastForward")(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<TenantsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                              eq(entriesTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.id, clientView.tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
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
                  .select(getTableColumns(table))
                  .from(table)
                  .innerJoin(
                    IdentityProvidersSchema.table.definition,
                    eq(
                      IdentityProvidersSchema.table.definition.tenantId,
                      table.id,
                    ),
                  )
                  .where(
                    and(
                      eq(IdentityProvidersSchema.table.definition.kind, kind),
                      eq(IdentityProvidersSchema.table.definition.id, id),
                    ),
                  ),
              )
              .pipe(Effect.flatMap(Array.head)),
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

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/tenants/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder({
            entity: getTableName(TenantsSchema.table.definition),
          })
            .query(AccessControl.permission("tenants:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/tenants/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default, Permissions.Schemas.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyEdit = (_tenant: TenantsContract.DataTransferObject) =>
          notifier.notify(
            Array.make(PullPermission.make({ permission: "tenants:read" })),
          );

        const edit = MutationsContract.makeMutation(TenantsContract.edit, {
          makePolicy: Effect.fn("Tenants.Mutations.edit.makePolicy")(() =>
            AccessControl.permission("tenants:update"),
          ),
          mutator: Effect.fn("Tenants.Mutations.edit.mutator")(
            (tenant, session) =>
              repository
                .updateById(session.tenantId, tenant)
                .pipe(Effect.tap(notifyEdit)),
          ),
        });

        return { edit } as const;
      }),
    },
  ) {}

  export class LicensesRepository extends Effect.Service<LicensesRepository>()(
    "@printdesk/core/tenants/LicensesRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = LicensesSchema.table.definition;

        const findByKeyWithTenant = Effect.fn(
          "Tenants.LicensesRepository.findByKey",
        )((key: LicensesSchema.Row["key"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({
                  license: table,
                  tenant: TenantsSchema.table.definition,
                })
                .from(table)
                .leftJoin(
                  TenantsSchema.table.definition,
                  eq(TenantsSchema.table.definition.id, table.tenantId),
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

        const isAvailable = PoliciesContract.makePolicy(
          LicensesContract.isAvailable,
          {
            make: Effect.fn("Tenants.LicensesPolicies.isAvailable.make")(
              ({ key }) =>
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
            ),
          },
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
        const table = TenantMetadataSchema.table.definition;

        const upsert = Effect.fn("Tenants.MetadataRepository.upsert")(
          (metadata: InferInsertModel<TenantMetadataSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(metadata)
                  .onConflictDoUpdate({
                    target: [table.tenantId],
                    set: TenantMetadataSchema.table.conflictSet,
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
                  eq(table.tenantId, ColumnsContract.TenantId.make(tenantId)),
                ),
            )
            .pipe(Effect.flatMap(Array.head)),
        );

        return { upsert, findByTenant } as const;
      }),
    },
  ) {}
}
