import { and, eq, getViewName, getViewSelectedFields, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { SharedAccountManagerAccessRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import { SharedAccountManagerAccessContract } from "../../contracts";
import {
  activeCustomerAuthorizedSharedAccountManagerAccessView,
  activeSharedAccountManagerAccessView,
  sharedAccountManagerAccess,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveAuthorizedSharedAccountManagerAccess,
  ActiveCustomerAuthorizedSharedAccountManagerAccess,
  ActiveSharedAccountManagerAccess,
  SharedAccountManagerAccess,
  SharedAccountManagerAccessTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccountManagerAccess.table;
  const activeView = activeSharedAccountManagerAccessView;
  const activeCustomerAuthorizedView = activeCustomerAuthorizedSharedAccountManagerAccessView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("SharedAccounts.ManagerAccessRepository.create")(
    (value: InferInsertModel<SharedAccountManagerAccessTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(value).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findCreates = Effect.fn("SharedAccounts.ManagerAccessRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountManagerAccess.name}_creates`)
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

  const findActiveCreates = Effect.fn("SharedAccounts.ManagerAccessRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountManagerAccess.name, clientView).pipe(
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
    "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveAuthorizedSharedAccountManagerAccess["managerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${SharedAccountManagerAccessContract.ActiveAuthorizedView.name}_creates`)
              .as(
                tx
                  .select(getViewSelectedFields(activeView))
                  .from(activeView)
                  .where(
                    and(
                      eq(activeView.managerId, managerId),
                      eq(activeView.tenantId, clientView.tenantId),
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

  const findActiveCustomerAuthorizedCreates = Effect.fn(
    "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountManagerAccess["customerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountManagerAccess.name, clientView).pipe(
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

  const findUpdates = Effect.fn("SharedAccounts.ManagerAccessRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountManagerAccess.name}_updates`)
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

            return tx.with(cte).select(cte[sharedAccountManagerAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("SharedAccounts.ManagerAccessRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountManagerAccess.name, clientView).pipe(
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
    "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveAuthorizedSharedAccountManagerAccess["managerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${SharedAccountManagerAccessContract.ActiveAuthorizedView.name}_updates`)
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
                  .where(
                    and(
                      eq(activeView.managerId, managerId),
                      eq(activeView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveCustomerAuthorizedUpdates = Effect.fn(
    "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountManagerAccess["customerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountManagerAccess.name, clientView).pipe(
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

  const findDeletes = Effect.fn("SharedAccounts.ManagerAccessRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountManagerAccess.name, clientView)
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

  const findActiveDeletes = Effect.fn("SharedAccounts.ManagerAccessRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountManagerAccess.name, clientView)
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
    "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveAuthorizedSharedAccountManagerAccess["managerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activeView.id })
                .from(activeView)
                .where(
                  and(
                    eq(activeView.managerId, managerId),
                    eq(activeView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findActiveCustomerAuthorizedDeletes = Effect.fn(
    "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountManagerAccess["customerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountManagerAccess.name, clientView).pipe(
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

  const findFastForward = Effect.fn("SharedAccounts.ManagerAccessRepository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<SharedAccountManagerAccess["id"]>) =>
      entriesQueryBuilder.fastForward(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountManagerAccess.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[sharedAccountManagerAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn(
    "SharedAccounts.ManagerAccessRepository.findActiveFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActiveSharedAccountManagerAccess["id"]>) =>
    entriesQueryBuilder.fastForward(sharedAccountManagerAccess.name, clientView).pipe(
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
    "SharedAccounts.ManagerAccessRepository.findActiveAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveAuthorizedSharedAccountManagerAccess["id"]>,
      managerId: ActiveAuthorizedSharedAccountManagerAccess["managerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountManagerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${SharedAccountManagerAccessContract.ActiveAuthorizedView.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeView,
                    and(
                      eq(entriesTable.entityId, activeView.id),
                      notInArray(activeView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeView.managerId, managerId),
                      eq(activeView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveCustomerAuthorizedFastForward = Effect.fn(
    "SharedAccounts.ManagerAccessRepository.findActiveCustomerAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerAuthorizedSharedAccountManagerAccess["id"]>,
      customerId: ActiveCustomerAuthorizedSharedAccountManagerAccess["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountManagerAccess.name, clientView).pipe(
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

  const findById = Effect.fn("SharedAccounts.ManagerAccessRepository.findById")(
    (id: SharedAccountManagerAccess["id"], tenantId: SharedAccountManagerAccess["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("SharedAccounts.ManagerAccessRepository.updateById")(
    (
      id: SharedAccountManagerAccess["id"],
      access: Partial<Omit<SharedAccountManagerAccess, "id" | "tenantId">>,
      tenantId: SharedAccountManagerAccess["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(access)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    create,
    findCreates,
    findActiveCreates,
    findActiveAuthorizedCreates,
    findActiveCustomerAuthorizedCreates,
    findUpdates,
    findActiveUpdates,
    findActiveAuthorizedUpdates,
    findActiveCustomerAuthorizedUpdates,
    findDeletes,
    findActiveDeletes,
    findActiveAuthorizedDeletes,
    findActiveCustomerAuthorizedDeletes,
    findFastForward,
    findActiveFastForward,
    findActiveAuthorizedFastForward,
    findActiveCustomerAuthorizedFastForward,
    findById,
    updateById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountManagerAccessRepository));
