import { and, eq, getViewName, getViewSelectedFields, inArray, not, notInArray } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { SharedAccountWorkflowsRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntriesTable } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import {
  activeCustomerAuthorizedSharedAccountWorkflowsView,
  activeManagerAuthorizedSharedAccountWorkflowsView,
  activeSharedAccountWorkflowsView,
  sharedAccountWorkflows,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type {
  ActiveCustomerAuthorizedSharedAccountWorkflow,
  ActiveManagerAuthorizedSharedAccountWorkflow,
  ActiveSharedAccountWorkflow,
  SharedAccountWorkflow,
  SharedAccountWorkflowsTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = sharedAccountWorkflows.table;
  const activeView = activeSharedAccountWorkflowsView;
  const activeCustomerAuthorizedView = activeCustomerAuthorizedSharedAccountWorkflowsView;
  const activeManagerAuthorizedView = activeManagerAuthorizedSharedAccountWorkflowsView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntriesTable;

  const create = Effect.fn("SharedAccountWorkflows.Repository.create")(
    (workflow: InferInsertModel<SharedAccountWorkflowsTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(workflow).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findCreates = Effect.fn("SharedAccountWorkflows.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountWorkflows.name}_creates`)
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

  const findActiveCreates = Effect.fn("SharedAccountWorkflows.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(sharedAccountWorkflows.name, clientView).pipe(
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
    "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflow["customerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountWorkflows.name, clientView).pipe(
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
    "SharedAccountWorkflows.Repository.findActiveManagerAuthorizedCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflow["managerId"],
    ) =>
      entriesQueryBuilder.creates(sharedAccountWorkflows.name, clientView).pipe(
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

  const findUpdates = Effect.fn("SharedAccountWorkflows.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountWorkflows.name}_updates`)
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

            return tx.with(cte).select(cte[sharedAccountWorkflows.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("SharedAccountWorkflows.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(sharedAccountWorkflows.name, clientView).pipe(
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
    "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflow["customerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountWorkflows.name, clientView).pipe(
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
    "SharedAccountWorkflows.Repository.findActiveManagerAuthorizedUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflow["managerId"],
    ) =>
      entriesQueryBuilder.updates(sharedAccountWorkflows.name, clientView).pipe(
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

  const findDeletes = Effect.fn("SharedAccountWorkflows.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountWorkflows.name, clientView)
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

  const findActiveDeletes = Effect.fn("SharedAccountWorkflows.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(sharedAccountWorkflows.name, clientView)
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
    "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflow["customerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activeCustomerAuthorizedView.id })
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
    "SharedAccountWorkflows.Repository.findActiveManagerAuthorizedDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflow["managerId"],
    ) =>
      entriesQueryBuilder.deletes(sharedAccountWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activeManagerAuthorizedView.id })
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

  const findFastForward = Effect.fn("SharedAccountWorkflows.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<SharedAccountWorkflow["id"]>) =>
      entriesQueryBuilder.fastForward(sharedAccountWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${sharedAccountWorkflows.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[sharedAccountWorkflows.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn(
    "SharedAccountWorkflows.Repository.findActiveFastForward",
  )((clientView: ReplicacheClientView, excludeIds: Array<ActiveSharedAccountWorkflow["id"]>) =>
    entriesQueryBuilder.fastForward(sharedAccountWorkflows.name, clientView).pipe(
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

  const findActiveCustomerAuthorizedFastForward = Effect.fn(
    "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerAuthorizedSharedAccountWorkflow["id"]>,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflow["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountWorkflows.name, clientView).pipe(
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
    "SharedAccountWorkflows.Repository.findActiveManagerAuthorizedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountWorkflow["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflow["managerId"],
    ) =>
      entriesQueryBuilder.fastForward(sharedAccountWorkflows.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedView.id),
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

  const findById = Effect.fn("SharedAccountWorkflows.Repository.findById")(
    (id: SharedAccountWorkflow["id"], tenantId: SharedAccountWorkflow["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findActiveCustomerAuthorized = Effect.fn(
    "SharedAccountWorkflows.Repository.findActiveCustomerAuthorized",
  )(
    (
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflow["customerId"],
      id: ActiveCustomerAuthorizedSharedAccountWorkflow["id"],
      tenantId: ActiveCustomerAuthorizedSharedAccountWorkflow["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(activeCustomerAuthorizedView)
            .where(
              and(
                eq(activeCustomerAuthorizedView.customerId, customerId),
                eq(activeCustomerAuthorizedView.id, id),
                eq(activeCustomerAuthorizedView.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findActiveManagerAuthorized = Effect.fn(
    "SharedAccountWorkflows.Repository.findActiveManagerAuthorized",
  )(
    (
      managerId: ActiveManagerAuthorizedSharedAccountWorkflow["managerId"],
      id: ActiveManagerAuthorizedSharedAccountWorkflow["id"],
      tenantId: ActiveManagerAuthorizedSharedAccountWorkflow["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(activeManagerAuthorizedView)
            .where(
              and(
                eq(activeManagerAuthorizedView.managerId, managerId),
                eq(activeManagerAuthorizedView.id, id),
                eq(activeManagerAuthorizedView.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    create,
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
    findActiveCustomerAuthorized,
    findActiveManagerAuthorized,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountWorkflowsRepository));
