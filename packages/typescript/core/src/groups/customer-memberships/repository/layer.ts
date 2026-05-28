import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { CustomerGroupMembershipsRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import { activeCustomerGroupMembershipsView, customerGroupMemberships } from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type { ActiveCustomerGroup, CustomerGroup, CustomerGroupMembershipsTable } from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = customerGroupMemberships.table;
  const activeView = activeCustomerGroupMembershipsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const upsertMany = Effect.fn("Groups.CustomerMembershipsRepository.upsertMany")(
    (values: Array.NonEmptyArray<InferInsertModel<CustomerGroupMembershipsTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.id, table.tenantId],
            set: customerGroupMemberships.conflictSet,
          })
          .returning(),
      ),
  );

  const findCreates = Effect.fn("Groups.CustomerMembershipsRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(customerGroupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${customerGroupMemberships.name}_creates`)
              .as(tx.select().from(table).where(eq(table.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveCreates = Effect.fn("Groups.CustomerMembershipsRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(customerGroupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_creates`)
              .as(tx.select().from(activeView).where(eq(activeView.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findUpdates = Effect.fn("Groups.CustomerMembershipsRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(customerGroupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${customerGroupMemberships.name}_updates`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(
                      eq(entriesTable.entityId, table.id),
                      not(eq(entriesTable.entityVersion, table.version)),
                      eq(entriesTable.tenantId, table.tenantId),
                    ),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[customerGroupMemberships.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Groups.CustomerMembershipsRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(customerGroupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeView,
                    and(
                      eq(entriesTable.entityId, activeView.id),
                      not(eq(entriesTable.entityVersion, activeView.version)),
                      eq(entriesTable.tenantId, activeView.tenantId),
                    ),
                  )
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("Groups.CustomerMembershipsRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(customerGroupMemberships.name, clientView)
        .pipe(
          Effect.flatMap((qb) =>
            db.useTransaction((tx) =>
              qb.except(
                tx
                  .select({ id: table.id })
                  .from(table)
                  .where(eq(table.tenantId, clientView.tenantId)),
              ),
            ),
          ),
        ),
  );

  const findActiveDeletes = Effect.fn("Groups.CustomerMembershipsRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(customerGroupMemberships.name, clientView)
        .pipe(
          Effect.flatMap((qb) =>
            db.useTransaction((tx) =>
              qb.except(
                tx
                  .select({ id: activeView.id })
                  .from(activeView)
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              ),
            ),
          ),
        ),
  );

  const findFastForward = Effect.fn("Groups.CustomerMembershipsRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<CustomerGroup["id"]>) =>
      entriesQueryBuilder.fastForward(customerGroupMemberships.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${customerGroupMemberships.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[customerGroupMemberships.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn(
    "Groups.CustomerMembershipsRepository.findActiveFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActiveCustomerGroup["id"]>) =>
    entriesQueryBuilder.fastForward(customerGroupMemberships.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activeView)}_fast_forward`)
            .as(
              qb
                .innerJoin(
                  activeView,
                  and(
                    eq(entriesTable.entityId, activeView.id),
                    notInArray(activeView.id, excludeIds),
                  ),
                )
                .where(eq(activeView.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
        }),
      ),
    ),
  );

  return {
    upsertMany,
    findCreates,
    findActiveCreates,
    findUpdates,
    findActiveUpdates,
    findDeletes,
    findActiveDeletes,
    findFastForward,
    findActiveFastForward,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(CustomerGroupMembershipsRepository));
