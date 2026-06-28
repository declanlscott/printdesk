import { and, eq, getViewName, getViewSelectedFields, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { SharedAccountsRepository } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import {
  activeCustomerAuthorizedSharedAccountsView,
  activeManagerAuthorizedSharedAccountsView,
  activeSharedAccountsView,
  sharedAccounts,
} from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type {
  ActiveCustomerAuthorizedSharedAccount,
  ActiveManagerAuthorizedSharedAccount,
  ActiveSharedAccount,
  SharedAccount,
  SharedAccountByOrigin,
  SharedAccountsTable,
} from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccounts.table;
  const activeView = activeSharedAccountsView;
  const activeManagerAuthorizedView = activeManagerAuthorizedSharedAccountsView;
  const activeCustomerAuthorizedView = activeCustomerAuthorizedSharedAccountsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const upsertMany = Effect.fn("SharedAccounts.Repository.upsertMany")(
    (values: Array.NonEmptyArray<InferInsertModel<SharedAccountsTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.name, table.papercutId, table.tenantId],
            set: sharedAccounts.conflictSet,
          })
          .returning(),
      ),
  );

  const findCreates = Effect.fn("SharedAccounts.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccounts.name}_creates`)
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

  const findActiveCreates = Effect.fn("SharedAccounts.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccounts.name, clientView).pipe(
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

  const findActiveCustomerAuthorizedCreates = Effect.fn(
    "SharedAccounts.Repository.findActiveCustomerAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccount["customerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx.$with(`${getViewName(activeCustomerAuthorizedView)}_creates`).as(
              tx
                .selectDistinctOn(
                  [activeCustomerAuthorizedView.id, activeCustomerAuthorizedView.tenantId],
                  Struct.omit(getViewSelectedFields(activeCustomerAuthorizedView), ["customerId"]),
                )
                .from(activeCustomerAuthorizedView)
                .where(
                  and(
                    eq(activeCustomerAuthorizedView.customerId, customerId),
                    eq(activeCustomerAuthorizedView.tenantId, clientView.tenantId),
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

  const findActiveManagerAuthorizedCreates = Effect.fn(
    "SharedAccounts.Repository.findActiveManagerAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccount["managerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx.$with(`${getViewName(activeManagerAuthorizedView)}_creates`).as(
              tx
                .selectDistinctOn(
                  [activeManagerAuthorizedView.id, activeManagerAuthorizedView.tenantId],
                  Struct.omit(getViewSelectedFields(activeManagerAuthorizedView), ["managerId"]),
                )
                .from(activeManagerAuthorizedView)
                .where(
                  and(
                    eq(activeManagerAuthorizedView.managerId, managerId),
                    eq(activeManagerAuthorizedView.tenantId, clientView.tenantId),
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

  const findUpdates = Effect.fn("SharedAccounts.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccounts.name}_updates`)
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

            return tx.with(cte).select(cte[sharedAccounts.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("SharedAccounts.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccounts.name, clientView).pipe(
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

  const findActiveCustomerAuthorizedUpdates = Effect.fn(
    "SharedAccounts.Repository.findActiveCustomerAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccount["customerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerAuthorizedView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerAuthorizedView,
                    and(
                      eq(entriesTable.entityId, activeCustomerAuthorizedView.id),
                      not(eq(entriesTable.entityVersion, activeCustomerAuthorizedView.version)),
                      eq(entriesTable.tenantId, activeCustomerAuthorizedView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerAuthorizedView.customerId, customerId),
                      eq(activeCustomerAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeCustomerAuthorizedView)].id,
                  cte[getViewName(activeCustomerAuthorizedView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeCustomerAuthorizedView)], ["customerId"]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedUpdates = Effect.fn(
    "SharedAccounts.Repository.findActiveManagerAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccount["managerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedView.id),
                      not(eq(entriesTable.entityVersion, activeManagerAuthorizedView.version)),
                      eq(entriesTable.tenantId, activeManagerAuthorizedView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedView.managerId, managerId),
                      eq(activeManagerAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedView)].id,
                  cte[getViewName(activeManagerAuthorizedView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedView)], ["managerId"]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("SharedAccounts.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccounts.name, clientView)
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

  const findActiveDeletes = Effect.fn("SharedAccounts.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccounts.name, clientView)
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

  const findActiveCustomerAuthorizedDeletes = Effect.fn(
    "SharedAccounts.Repository.findActiveCustomerAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccount["customerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .selectDistinctOn(
                  [activeCustomerAuthorizedView.id, activeCustomerAuthorizedView.tenantId],
                  { id: activeCustomerAuthorizedView.id },
                )
                .from(activeCustomerAuthorizedView)
                .where(
                  and(
                    eq(activeCustomerAuthorizedView.customerId, customerId),
                    eq(activeCustomerAuthorizedView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findActiveManagerAuthorizedDeletes = Effect.fn(
    "SharedAccounts.Repository.findActiveManagerAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccount["managerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .selectDistinctOn(
                  [activeManagerAuthorizedView.id, activeManagerAuthorizedView.tenantId],
                  { id: activeManagerAuthorizedView.id },
                )
                .from(activeManagerAuthorizedView)
                .where(
                  and(
                    eq(activeManagerAuthorizedView.managerId, managerId),
                    eq(activeManagerAuthorizedView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("SharedAccounts.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<SharedAccount["id"]>) =>
      entriesQueryBuilder.fastForward(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccounts.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entity, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[sharedAccounts.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("SharedAccounts.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveSharedAccount["id"]>) =>
      entriesQueryBuilder.fastForward(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeView,
                    and(
                      eq(entriesTable.entity, activeView.id),
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

  const findActiveCustomerAuthorizedFastForward = Effect.fn(
    "SharedAccounts.Repository.findActiveCustomerAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerAuthorizedSharedAccount["id"]>,
      customerId: ActiveCustomerAuthorizedSharedAccount["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerAuthorizedView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerAuthorizedView,
                    and(
                      eq(entriesTable.entityId, activeCustomerAuthorizedView.id),
                      notInArray(activeCustomerAuthorizedView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerAuthorizedView.customerId, customerId),
                      eq(activeCustomerAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeCustomerAuthorizedView)].id,
                  cte[getViewName(activeCustomerAuthorizedView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeCustomerAuthorizedView)], ["customerId"]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedFastForward = Effect.fn(
    "SharedAccounts.Repository.findActiveManagerAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccount["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccount["managerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccounts.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedView,
                    and(
                      eq(entriesTable.entity, activeManagerAuthorizedView.id),
                      notInArray(activeManagerAuthorizedView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedView.managerId, managerId),
                      eq(activeManagerAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedView)].id,
                  cte[getViewName(activeManagerAuthorizedView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedView)], ["managerId"]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findById = Effect.fn("SharedAccounts.Repository.findById")(
    (id: SharedAccount["id"], tenantId: SharedAccount["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findByOrigin = Effect.fn("SharedAccounts.Repository.findByOrigin")(
    <TSharedAccountOrigin extends SharedAccount["origin"]>(
      origin: TSharedAccountOrigin,
      tenantId: SharedAccount["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.origin, origin), eq(table.tenantId, tenantId))),
        )
        .pipe(
          Effect.map((accounts) => accounts as Array<SharedAccountByOrigin<TSharedAccountOrigin>>),
        ),
  );

  const findActiveAuthorizedCustomerIds = Effect.fn(
    "SharedAccounts.Repository.findActiveAuthorizedCustomerIds",
  )(
    (
      id: ActiveCustomerAuthorizedSharedAccount["id"],
      tenantId: ActiveCustomerAuthorizedSharedAccount["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              customerId: activeCustomerAuthorizedView.customerId,
            })
            .from(activeCustomerAuthorizedView)
            .where(
              and(
                eq(activeCustomerAuthorizedView.id, id),
                eq(activeCustomerAuthorizedView.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.map(Struct.get("customerId")))),
  );

  const findActiveAuthorizedManagerIds = Effect.fn(
    "SharedAccounts.Repository.findActiveAuthorizedManagerIds",
  )(
    (
      id: ActiveManagerAuthorizedSharedAccount["id"],
      tenantId: ActiveManagerAuthorizedSharedAccount["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select({ managerId: activeManagerAuthorizedView.managerId })
            .from(activeManagerAuthorizedView)
            .where(
              and(
                eq(activeManagerAuthorizedView.id, id),
                eq(activeManagerAuthorizedView.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.map(Struct.get("managerId")))),
  );

  const updateById = Effect.fn("SharedAccounts.Repository.updateById")(
    (
      id: SharedAccount["id"],
      sharedAccount: Partial<Omit<SharedAccount, "id" | "tenantId">>,
      tenantId: SharedAccount["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(sharedAccount)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    upsertMany,
    findCreates,
    findActiveCreates,
    findActiveCustomerAuthorizedCreates,
    findActiveManagerAuthorizedCreates,
    findUpdates,
    findActiveUpdates,
    findActiveCustomerAuthorizedUpdates,
    findActiveManagerAuthorizedUpdates,
    findDeletes,
    findActiveDeletes,
    findActiveCustomerAuthorizedDeletes,
    findActiveManagerAuthorizedDeletes,
    findFastForward,
    findActiveFastForward,
    findActiveCustomerAuthorizedFastForward,
    findActiveManagerAuthorizedFastForward,
    findById,
    findByOrigin,
    findActiveAuthorizedCustomerIds,
    findActiveAuthorizedManagerIds,
    updateById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountsRepository));
