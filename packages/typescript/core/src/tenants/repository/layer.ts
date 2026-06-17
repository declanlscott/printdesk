import { and, eq, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { TenantsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import { tenants } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type { Tenant, TenantsTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = tenants.table;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("Tenants.Repository.create")((value: InferInsertModel<TenantsTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findCreates = Effect.fn("Tenants.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(tenants.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${tenants.name}_creates`)
              .as(tx.select().from(table).where(eq(table.id, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findUpdates = Effect.fn("Tenants.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(tenants.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${tenants.name}_updates`)
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

            return tx.with(cte).select(cte[tenants.name]).from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("Tenants.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(tenants.name, clientView)
        .pipe(
          Effect.flatMap((qb) =>
            db.useTransaction((tx) =>
              qb.except(
                tx.select({ id: table.id }).from(table).where(eq(table.id, clientView.tenantId)),
              ),
            ),
          ),
        ),
  );

  const findFastForward = Effect.fn("Tenants.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Tenant["id"]>) =>
      entriesQueryBuilder.fastForward(tenants.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${tenants.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.id, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[tenants.name]).from(cte);
          }),
        ),
      ),
  );

  const findById = Effect.fn("Tenants.Repository.findById")((id: Tenant["id"]) =>
    db
      .useTransaction((tx) => tx.select().from(table).where(eq(table.id, id)))
      .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findBySlug = Effect.fn("Tenants.Repository.findBySlug")((slug: Tenant["slug"]) =>
    db
      .useTransaction((tx) => tx.select().from(table).where(eq(table.slug, slug)))
      .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Tenants.Repository.updateById")(
    (id: Tenant["id"], tenant: Partial<Omit<Tenant, "id">>) =>
      db
        .useTransaction((tx) => tx.update(table).set(tenant).where(eq(table.id, id)).returning())
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const deleteById = Effect.fn("Tenants.Repository.deleteById")((id: Tenant["id"]) =>
    db.useTransaction((tx) => tx.delete(table).where(eq(table.id, id))).pipe(Effect.asVoid),
  );

  return {
    create,
    findCreates,
    findUpdates,
    findDeletes,
    findFastForward,
    findById,
    findBySlug,
    updateById,
    deleteById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(TenantsRepository));
