import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SharedAccountCustomerGroupAccessRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import {
  activeAuthorizedSharedAccountCustomerGroupAccessView,
  activeSharedAccountCustomerGroupAccessView,
  sharedAccountCustomerGroupAccess,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveAuthorizedSharedAccountCustomerGroupAccess,
  ActiveSharedAccountCustomerGroupAccess,
  SharedAccountCustomerGroupAccess,
  SharedAccountCustomerGroupAccessTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccountCustomerGroupAccess.table;
  const activeView = activeSharedAccountCustomerGroupAccessView;
  const activeAuthorizedView = activeAuthorizedSharedAccountCustomerGroupAccessView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const upsertMany = Effect.fn("SharedAccounts.CustomerGroupAccessRepository.upsertMany")(
    (values: Array<InferInsertModel<SharedAccountCustomerGroupAccessTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.customerGroupId, table.sharedAccountId, table.tenantId],
            set: sharedAccountCustomerGroupAccess.conflictSet,
          })
          .returning(),
      ),
  );

  const findCreates = Effect.fn("SharedAccounts.CustomerGroupAccessRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountCustomerGroupAccess.name}_creates`)
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

  const findActiveCreates = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveCreates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.creates(sharedAccountCustomerGroupAccess.name, clientView).pipe(
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

  const findActiveAuthorizedCreates = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      memberId: ActiveAuthorizedSharedAccountCustomerGroupAccess["memberId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx.$with(`${getViewName(activeAuthorizedView)}_creates`).as(
              tx
                .select()
                .from(activeAuthorizedView)
                .where(
                  and(
                    eq(activeAuthorizedView.memberId, memberId),
                    eq(activeAuthorizedView.tenantId, clientView.tenantId),
                  ),
                ),
            );

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findUpdates = Effect.fn("SharedAccounts.CustomerGroupAccessRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountCustomerGroupAccess.name}_updates`)
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

            return tx.with(cte).select(cte[sharedAccountCustomerGroupAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveUpdates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.updates(sharedAccountCustomerGroupAccess.name, clientView).pipe(
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

  const findActiveAuthorizedUpdates = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      memberId: ActiveAuthorizedSharedAccountCustomerGroupAccess["memberId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeAuthorizedView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeAuthorizedView,
                    and(
                      eq(entriesTable.entityId, activeAuthorizedView.id),
                      not(eq(entriesTable.entityVersion, activeAuthorizedView.version)),
                      eq(entriesTable.tenantId, activeAuthorizedView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeAuthorizedView.memberId, memberId),
                      eq(activeAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeAuthorizedView)]).from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("SharedAccounts.CustomerGroupAccessRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountCustomerGroupAccess.name, clientView)
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

  const findActiveDeletes = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveDeletes",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(sharedAccountCustomerGroupAccess.name, clientView)
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

  const findActiveAuthorizedDeletes = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      memberId: ActiveAuthorizedSharedAccountCustomerGroupAccess["memberId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activeAuthorizedView.id })
                .from(activeAuthorizedView)
                .where(
                  and(
                    eq(activeAuthorizedView.memberId, memberId),
                    eq(activeAuthorizedView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("SharedAccounts.CustomerGroupAccessRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<SharedAccountCustomerGroupAccess["id"]>) =>
      entriesQueryBuilder.fastForward(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountCustomerGroupAccess.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[sharedAccountCustomerGroupAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveSharedAccountCustomerGroupAccess["id"]>,
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountCustomerGroupAccess.name, clientView).pipe(
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

  const findActiveAuthorizedFastForward = Effect.fn(
    "SharedAccounts.CustomerGroupAccessRepository.findActiveAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveAuthorizedSharedAccountCustomerGroupAccess["id"]>,
      memberId: ActiveAuthorizedSharedAccountCustomerGroupAccess["memberId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountCustomerGroupAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeAuthorizedView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeAuthorizedView,
                    and(
                      eq(entriesTable.entityId, activeAuthorizedView.id),
                      notInArray(activeAuthorizedView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeAuthorizedView.memberId, memberId),
                      eq(activeAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeAuthorizedView)]).from(cte);
          }),
        ),
      ),
  );

  return {
    upsertMany,
    findCreates,
    findActiveCreates,
    findActiveAuthorizedCreates,
    findUpdates,
    findActiveUpdates,
    findActiveAuthorizedUpdates,
    findDeletes,
    findActiveDeletes,
    findActiveAuthorizedDeletes,
    findFastForward,
    findActiveFastForward,
    findActiveAuthorizedFastForward,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerGroupAccessRepository));
