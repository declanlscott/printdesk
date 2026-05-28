import { and, eq, getViewName, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { SharedAccountCustomerAccessRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntries } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import { SharedAccountCustomerAccessContract } from "../../contracts";
import {
  activeSharedAccountCustomerAccessView,
  sharedAccountCustomerAccess,
  sharedAccounts,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveAuthorizedSharedAccountCustomerAccess,
  SharedAccount,
  SharedAccountCustomerAccess,
  SharedAccountCustomerAccessTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccountCustomerAccess.table;
  const activeView = activeSharedAccountCustomerAccessView;
  const activeAuthorizedView = activeSharedAccountCustomerAccessView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const upsertMany = Effect.fn("SharedAccounts.CustomerAccessRepository.upsertMany")(
    (values: Array<InferInsertModel<SharedAccountCustomerAccessTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.customerId, table.sharedAccountId, table.tenantId],
            set: sharedAccountCustomerAccess.conflictSet,
          })
          .returning(),
      ),
  );

  const findCreates = Effect.fn("SharedAccounts.CustomerAccessRepository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountCustomerAccess.name}_creates`)
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

  const findActiveCreates = Effect.fn("SharedAccounts.CustomerAccessRepository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountCustomerAccess.name, clientView).pipe(
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
    "SharedAccounts.CustomerAccessRepository.findActiveAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveAuthorizedSharedAccountCustomerAccess["customerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${SharedAccountCustomerAccessContract.ActiveAuthorizedView.name}_creates`)
              .as(
                tx
                  .select()
                  .from(activeAuthorizedView)
                  .where(
                    and(
                      eq(activeAuthorizedView.customerId, customerId),
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

  const findUpdates = Effect.fn("SharedAccounts.CustomerAccessRepository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_updates`)
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

            return tx.with(cte).select(cte[sharedAccountCustomerAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("SharedAccounts.CustomerAccessRepository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountCustomerAccess.name, clientView).pipe(
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
    "SharedAccounts.CustomerAccessRepository.findActiveAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveAuthorizedSharedAccountCustomerAccess["customerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${SharedAccountCustomerAccessContract.ActiveAuthorizedView.name}_updates`)
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
                      eq(activeAuthorizedView.customerId, customerId),
                      eq(activeAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeAuthorizedView)]).from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("SharedAccounts.CustomerAccessRepository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountCustomerAccess.name, clientView)
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

  const findActiveDeletes = Effect.fn("SharedAccounts.CustomerAccessRepository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountCustomerAccess.name, clientView)
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
    "SharedAccounts.Repository.findActiveAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveAuthorizedSharedAccountCustomerAccess["customerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activeAuthorizedView.id })
                .from(activeAuthorizedView)
                .where(
                  and(
                    eq(activeAuthorizedView.customerId, customerId),
                    eq(activeAuthorizedView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("SharedAccounts.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<SharedAccountCustomerAccess["id"]>) =>
      entriesQueryBuilder.fastForward(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountCustomerAccess.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[sharedAccountCustomerAccess.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("SharedAccounts.Repository.findActiveFastForward")(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveAuthorizedSharedAccountCustomerAccess["id"]>,
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountCustomerAccess.name, clientView).pipe(
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
    "SharedAccounts.Repository.findActiveAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveAuthorizedSharedAccountCustomerAccess["id"]>,
      customerId: ActiveAuthorizedSharedAccountCustomerAccess["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountCustomerAccess.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(
                `${SharedAccountCustomerAccessContract.ActiveAuthorizedView.name}_fast_forward`,
              )
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
                      eq(activeAuthorizedView.customerId, customerId),
                      eq(activeAuthorizedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeAuthorizedView)]).from(cte);
          }),
        ),
      ),
  );

  const findByOrigin = Effect.fn("SharedAccounts.CustomerAccessRepository.findByOrigin")(
    <TSharedAccountOrigin extends SharedAccount["origin"]>(
      origin: TSharedAccountOrigin,
      tenantId: SharedAccountCustomerAccess["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select({ customerAccess: table })
            .from(table)
            .innerJoin(
              sharedAccounts.table,
              and(
                eq(sharedAccounts.table.id, table.sharedAccountId),
                eq(sharedAccounts.table.tenantId, table.tenantId),
              ),
            )
            .where(
              and(
                eq(sharedAccounts.table.origin, origin),
                origin === "papercut"
                  ? not(eq(sharedAccounts.table.papercutAccountId, -1))
                  : undefined,
                eq(table.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.map(Struct.get("customerAccess")))),
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
    findByOrigin,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountCustomerAccessRepository));
