import { and, eq, getTableColumns, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  SharedAccountGroupCustomerAccessRepository,
  SharedAccountGroupCustomerAccessSyncRepository,
} from ".";
import { Database } from "../../../database";
import { groups } from "../../../groups/sql";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import {
  activeAuthorizedSharedAccountGroupCustomerAccessView,
  activeSharedAccountGroupCustomerAccessView,
  sharedAccountGroupCustomerAccess,
  sharedAccounts,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveAuthorizedSharedAccountGroupCustomerAccess,
  ActiveSharedAccountGroupCustomerAccess,
  SharedAccount,
  SharedAccountByOrigin,
  SharedAccountGroupCustomerAccess,
  SharedAccountGroupCustomerAccessTable,
} from "../../sql";

export type Repository = Effect.Success<typeof makeRepository>;
export const makeRepository = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccountGroupCustomerAccess.table;

  const upsertMany = Effect.fn("SharedAccounts.GroupCustomerAccessRepository.upsertMany")(
    (values: Array<InferInsertModel<SharedAccountGroupCustomerAccessTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.groupId, table.sharedAccountId, table.tenantId],
            set: sharedAccountGroupCustomerAccess.conflictSet,
          })
          .returning(),
      ),
  );

  const findWithGroupAndSharedAccountByOrigin = Effect.fn(
    "SharedAccounts.GroupCustomerAccessRepository.findWithGroupAndSharedAccountByOrigin",
  )(
    <TSharedAccountOrigin extends SharedAccount["origin"]>(
      origin: TSharedAccountOrigin,
      tenantId: SharedAccountGroupCustomerAccess["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              access: getTableColumns(table),
              group: getTableColumns(groups.table),
              sharedAccount: getTableColumns(sharedAccounts.table),
            })
            .from(table)
            .innerJoin(
              sharedAccounts.table,
              and(
                eq(sharedAccounts.table.id, table.sharedAccountId),
                eq(sharedAccounts.table.tenantId, table.tenantId),
              ),
            )
            .innerJoin(
              groups.table,
              and(eq(groups.table.id, table.groupId), eq(groups.table.tenantId, table.tenantId)),
            )
            .where(and(eq(sharedAccounts.table.origin, origin), eq(table.tenantId, tenantId))),
        )
        .pipe(
          Effect.map(
            (data) =>
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              data as Array<{
                access: (typeof data)[number]["access"];
                group: (typeof data)[number]["group"];
                sharedAccount: SharedAccountByOrigin<TSharedAccountOrigin>;
              }>,
          ),
        ),
  );

  return {
    upsertMany,
    findWithGroupAndSharedAccountByOrigin,
  } as const;
});
export const repositoryLayer = makeRepository.pipe(
  Layer.effect(SharedAccountGroupCustomerAccessRepository),
);

export type SyncRepository = Effect.Success<typeof makeSyncRepository>;
export const makeSyncRepository = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccountGroupCustomerAccess.table;
  const activeView = activeSharedAccountGroupCustomerAccessView;
  const activeAuthorizedView = activeAuthorizedSharedAccountGroupCustomerAccessView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const findCreates = Effect.fn("SharedAccounts.GroupCustomerAccessSyncRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountGroupCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountGroupCustomerAccess.name}_creates`)
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
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveCreates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.creates(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      memberId: ActiveAuthorizedSharedAccountGroupCustomerAccess["memberId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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

  const findUpdates = Effect.fn("SharedAccounts.GroupCustomerAccessSyncRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountGroupCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountGroupCustomerAccess.name}_updates`)
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

            return tx.with(cte).select(cte[sharedAccountGroupCustomerAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn(
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveUpdates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.updates(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      memberId: ActiveAuthorizedSharedAccountGroupCustomerAccess["memberId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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

  const findDeletes = Effect.fn("SharedAccounts.GroupCustomerAccessSyncRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountGroupCustomerAccess.name, clientView)
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
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveDeletes",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(sharedAccountGroupCustomerAccess.name, clientView)
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
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      memberId: ActiveAuthorizedSharedAccountGroupCustomerAccess["memberId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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

  const findFastForward = Effect.fn(
    "SharedAccounts.GroupCustomerAccessSyncRepository.findFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<SharedAccountGroupCustomerAccess["id"]>) =>
    entriesQueryBuilder.fastForward(sharedAccountGroupCustomerAccess.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${sharedAccountGroupCustomerAccess.name}_fast_forward`)
            .as(
              qb
                .innerJoin(
                  table,
                  and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                )
                .where(eq(table.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[sharedAccountGroupCustomerAccess.name]).from(cte);
        }),
      ),
    ),
  );

  const findActiveFastForward = Effect.fn(
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveSharedAccountGroupCustomerAccess["id"]>,
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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
    "SharedAccounts.GroupCustomerAccessSyncRepository.findActiveAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveAuthorizedSharedAccountGroupCustomerAccess["id"]>,
      memberId: ActiveAuthorizedSharedAccountGroupCustomerAccess["memberId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountGroupCustomerAccess.name, clientView).pipe(
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
export const syncRepositoryLayer = makeSyncRepository.pipe(
  Layer.effect(SharedAccountGroupCustomerAccessSyncRepository),
);

export const layer = Layer.merge(repositoryLayer, syncRepositoryLayer);
