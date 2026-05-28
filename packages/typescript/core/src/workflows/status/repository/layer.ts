import {
  and,
  asc,
  between,
  desc,
  eq,
  getTableColumns,
  getViewName,
  getViewSelectedFields,
  gte,
  inArray,
  not,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { WorkflowStatusesRepository } from ".";
import { Database } from "../../../database";
import { replicacheClientViewEntriesTable } from "../../../replicache/sql";
import { SyncQueryBuilder } from "../../../sync/query-builder";
import {
  activeCustomerAuthorizedSharedAccountWorkflowStatusesView,
  activeManagerAuthorizedSharedAccountWorkflowStatusesView,
  activePublishedRoomWorkflowStatusesView,
  activeWorkflowStatusesView,
  workflowStatuses,
} from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../../replicache/sql";
import type { EntityId } from "../../../utils";
import type {
  ActiveCustomerAuthorizedSharedAccountWorkflowStatus,
  ActiveManagerAuthorizedSharedAccountWorkflowStatus,
  ActivePublishedRoomWorkflowStatus,
  ActiveWorkflowStatus,
  WorkflowStatus,
  WorkflowStatusesTable,
} from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = workflowStatuses.table;
  const activeView = activeWorkflowStatusesView;
  const activeCustomerAuthorizedSharedAccountView =
    activeCustomerAuthorizedSharedAccountWorkflowStatusesView;
  const activeManagerAuthorizedSharedAccountView =
    activeManagerAuthorizedSharedAccountWorkflowStatusesView;
  const activePublishedRoomView = activePublishedRoomWorkflowStatusesView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntriesTable;

  const create = Effect.fn("WorkflowStatuses.Repository.create")(
    (value: InferInsertModel<WorkflowStatusesTable>) =>
      db
        .useTransaction((tx) => tx.insert(table).values(value).returning())
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((status) => status as WorkflowStatus),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const upsertMany = Effect.fn("WorkflowStatuses.Repository.upsertMany")(
    (values: Array<InferInsertModel<WorkflowStatusesTable>>) =>
      db
        .useTransaction((tx) =>
          tx
            .insert(table)
            .values(values)
            .onConflictDoUpdate({
              target: [table.id, table.tenantId],
              set: workflowStatuses.conflictSet,
            })
            .returning(),
        )
        .pipe(Effect.map((statuses) => statuses as Array<WorkflowStatus>)),
  );

  const findCreates = Effect.fn("WorkflowStatuses.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${workflowStatuses.name}_creates`)
              .as(tx.select().from(table).where(eq(table.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
        Effect.map((statuses) => statuses as Array<WorkflowStatus>),
      ),
  );

  const findActiveCreates = Effect.fn("WorkflowStatuses.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(workflowStatuses.name, clientView).pipe(
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
        Effect.map((statuses) => statuses as Array<ActiveWorkflowStatus>),
      ),
  );

  const findActiveCustomerAuthorizedSharedAccountCreates = Effect.fn(
    "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflowStatus["customerId"],
    ) =>
      entriesQueryBuilder.creates(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerAuthorizedSharedAccountView)}_creates`)
              .as(
                tx
                  .selectDistinctOn(
                    [
                      activeCustomerAuthorizedSharedAccountView.id,
                      activeCustomerAuthorizedSharedAccountView.tenantId,
                    ],
                    Struct.omit(getViewSelectedFields(activeCustomerAuthorizedSharedAccountView), [
                      "customerId",
                    ]),
                  )
                  .from(activeCustomerAuthorizedSharedAccountView)
                  .where(
                    and(
                      eq(activeCustomerAuthorizedSharedAccountView.customerId, customerId),
                      eq(activeCustomerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
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
        Effect.map(
          (statuses) =>
            statuses as Array<
              Omit<ActiveCustomerAuthorizedSharedAccountWorkflowStatus, "customerId">
            >,
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountCreates = Effect.fn(
    "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflowStatus["managerId"],
    ) =>
      entriesQueryBuilder.creates(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_creates`)
              .as(
                tx
                  .selectDistinctOn(
                    [
                      activeManagerAuthorizedSharedAccountView.id,
                      activeManagerAuthorizedSharedAccountView.tenantId,
                    ],
                    Struct.omit(getViewSelectedFields(activeManagerAuthorizedSharedAccountView), [
                      "managerId",
                    ]),
                  )
                  .from(activeManagerAuthorizedSharedAccountView)
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.managerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
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
        Effect.map(
          (statuses) =>
            statuses as Array<
              Omit<ActiveManagerAuthorizedSharedAccountWorkflowStatus, "managerId">
            >,
        ),
      ),
  );

  const findActivePublishedRoomCreates = Effect.fn(
    "WorkflowStatuses.Repository.findActivePublishedRoomCreates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.creates(workflowStatuses.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_creates`)
            .as(
              tx
                .select()
                .from(activePublishedRoomView)
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            );

          return tx
            .with(cte)
            .select()
            .from(cte)
            .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
        }),
      ),
      Effect.map((statuses) => statuses as Array<ActivePublishedRoomWorkflowStatus>),
    ),
  );

  const findUpdates = Effect.fn("WorkflowStatuses.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${workflowStatuses.name}_updates`)
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

            return tx.with(cte).select(cte[workflowStatuses.name]).from(cte);
          }),
        ),
        Effect.map((statuses) => statuses as Array<WorkflowStatus>),
      ),
  );

  const findActiveUpdates = Effect.fn("WorkflowStatuses.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(workflowStatuses.name, clientView).pipe(
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
        Effect.map((statuses) => statuses as Array<ActiveWorkflowStatus>),
      ),
  );

  const findActiveCustomerAuthorizedSharedAccountUpdates = Effect.fn(
    "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflowStatus["customerId"],
    ) =>
      entriesQueryBuilder.updates(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerAuthorizedSharedAccountView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeCustomerAuthorizedSharedAccountView.id),
                      not(
                        eq(
                          entriesTable.entityVersion,
                          activeCustomerAuthorizedSharedAccountView.version,
                        ),
                      ),
                      eq(entriesTable.tenantId, activeCustomerAuthorizedSharedAccountView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerAuthorizedSharedAccountView.customerId, customerId),
                      eq(activeCustomerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeCustomerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeCustomerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeCustomerAuthorizedSharedAccountView)], [
                  "customerId",
                ]),
              )
              .from(cte);
          }),
        ),
        Effect.map(
          (statuses) =>
            statuses as Array<
              Omit<ActiveCustomerAuthorizedSharedAccountWorkflowStatus, "customerId">
            >,
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountUpdates = Effect.fn(
    "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflowStatus["managerId"],
    ) =>
      entriesQueryBuilder.updates(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountView.id),
                      not(
                        eq(
                          entriesTable.entityVersion,
                          activeManagerAuthorizedSharedAccountView.version,
                        ),
                      ),
                      eq(entriesTable.tenantId, activeManagerAuthorizedSharedAccountView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.managerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountView)], [
                  "managerId",
                ]),
              )
              .from(cte);
          }),
        ),
        Effect.map(
          (statuses) =>
            statuses as Array<
              Omit<ActiveManagerAuthorizedSharedAccountWorkflowStatus, "managerId">
            >,
        ),
      ),
  );

  const findActivePublishedRoomUpdates = Effect.fn(
    "WorkflowStatuses.Repository.findActivePublishedRoomUpdates",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder.updates(workflowStatuses.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${getViewName(activePublishedRoomView)}_updates`)
            .as(
              qb
                .innerJoin(
                  activePublishedRoomView,
                  and(
                    eq(entriesTable.entityId, activePublishedRoomView.id),
                    not(eq(entriesTable.entityVersion, activePublishedRoomView.version)),
                    eq(entriesTable.tenantId, activePublishedRoomView.tenantId),
                  ),
                )
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            );

          return tx.with(cte).select(cte[getViewName(activePublishedRoomView)]).from(cte);
        }),
      ),
      Effect.map((statuses) => statuses as Array<ActivePublishedRoomWorkflowStatus>),
    ),
  );

  const findDeletes = Effect.fn("WorkflowStatuses.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(workflowStatuses.name, clientView)
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

  const findActiveDeletes = Effect.fn("WorkflowStatuses.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(workflowStatuses.name, clientView)
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

  const findActiveCustomerAuthorizedSharedAccountDeletes = Effect.fn(
    "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflowStatus["customerId"],
    ) =>
      entriesQueryBuilder.deletes(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({
                  id: activeCustomerAuthorizedSharedAccountView.id,
                })
                .from(activeCustomerAuthorizedSharedAccountView)
                .where(
                  and(
                    eq(activeCustomerAuthorizedSharedAccountView.customerId, customerId),
                    eq(activeCustomerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountDeletes = Effect.fn(
    "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountDeletes",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflowStatus["managerId"],
    ) =>
      entriesQueryBuilder.deletes(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({
                  id: activeManagerAuthorizedSharedAccountView.id,
                })
                .from(activeManagerAuthorizedSharedAccountView)
                .where(
                  and(
                    eq(activeManagerAuthorizedSharedAccountView.managerId, managerId),
                    eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findActivePublishedRoomDeletes = Effect.fn(
    "WorkflowStatuses.Repository.findActivePublishedRoomDeletes",
  )((clientView: ReplicacheClientView) =>
    entriesQueryBuilder
      .deletes(workflowStatuses.name, clientView)
      .pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activePublishedRoomView.id })
                .from(activePublishedRoomView)
                .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("WorkflowStatuses.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<WorkflowStatus["id"]>) =>
      entriesQueryBuilder.fastForward(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${workflowStatuses.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[workflowStatuses.name]).from(cte);
          }),
        ),
        Effect.map((statuses) => statuses as Array<WorkflowStatus>),
      ),
  );

  const findActiveFastForward = Effect.fn("WorkflowStatuses.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveWorkflowStatus["id"]>) =>
      entriesQueryBuilder.fastForward(workflowStatuses.name, clientView).pipe(
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
        Effect.map((statuses) => statuses as Array<ActiveWorkflowStatus>),
      ),
  );

  const findActiveCustomerAuthorizedSharedAccountFastForward = Effect.fn(
    "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerAuthorizedSharedAccountWorkflowStatus["id"]>,
      customerId: ActiveCustomerAuthorizedSharedAccountWorkflowStatus["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerAuthorizedSharedAccountView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeCustomerAuthorizedSharedAccountView.id),
                      notInArray(activeCustomerAuthorizedSharedAccountView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerAuthorizedSharedAccountView.customerId, customerId),
                      eq(activeCustomerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeCustomerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeCustomerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeCustomerAuthorizedSharedAccountView)], [
                  "customerId",
                ]),
              )
              .from(cte);
          }),
        ),
        Effect.map(
          (statuses) =>
            statuses as Array<
              Omit<ActiveCustomerAuthorizedSharedAccountWorkflowStatus, "customerId">
            >,
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountFastForward = Effect.fn(
    "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountWorkflowStatus["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountWorkflowStatus["managerId"],
    ) =>
      entriesQueryBuilder.fastForward(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountView.id),
                      notInArray(activeManagerAuthorizedSharedAccountView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.managerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountView)], [
                  "managerId",
                ]),
              )
              .from(cte);
          }),
        ),
        Effect.map(
          (statuses) =>
            statuses as Array<
              Omit<ActiveManagerAuthorizedSharedAccountWorkflowStatus, "managerId">
            >,
        ),
      ),
  );

  const findActivePublishedRoomFastForward = Effect.fn(
    "WorkflowStatuses.Repository.findActivePublishedRoomFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActivePublishedRoomWorkflowStatus["id"]>,
    ) =>
      entriesQueryBuilder.fastForward(workflowStatuses.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activePublishedRoomView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activePublishedRoomView,
                    and(
                      eq(entriesTable.entityId, activePublishedRoomView.id),
                      notInArray(activePublishedRoomView.id, excludeIds),
                    ),
                  )
                  .where(eq(activePublishedRoomView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activePublishedRoomView)]).from(cte);
          }),
        ),
        Effect.map((statuses) => statuses as Array<ActivePublishedRoomWorkflowStatus>),
      ),
  );

  const findById = Effect.fn("WorkflowStatuses.Repository.findById")(
    (id: WorkflowStatus["id"], tenantId: WorkflowStatus["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((status) => status as WorkflowStatus),
        ),
  );

  const findLastByWorkflowId = Effect.fn("WorkflowStatuses.Repository.findLastByWorkflowId")(
    (workflowId: EntityId, tenantId: WorkflowStatus["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(
              and(
                or(
                  eq(table.roomWorkflowId, workflowId),
                  eq(table.sharedAccountWorkflowId, workflowId),
                ),
                eq(table.tenantId, tenantId),
              ),
            )
            .orderBy(desc(table.index))
            .limit(1),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((status) => status as WorkflowStatus),
        ),
  );

  const findSliceForUpdate = Effect.fn("WorkflowStatuses.Repository.findSliceForUpdate")(
    (
      id: WorkflowStatus["id"],
      tenantId: WorkflowStatus["tenantId"],
      index: WorkflowStatus["index"],
    ) =>
      db
        .useTransaction((tx) => {
          const cte = tx.$with("workflow_status").as(
            tx
              .select()
              .from(table)
              .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
              .limit(1),
          );

          return tx
            .with(cte)
            .select(getTableColumns(table))
            .from(table)
            .innerJoin(
              cte,
              or(
                eq(table.roomWorkflowId, cte.roomWorkflowId),
                eq(table.sharedAccountWorkflowId, cte.sharedAccountWorkflowId),
              ),
            )
            .where(
              and(
                between(
                  table.index,
                  sql`LEAST(${cte.index}, ${index})`,
                  sql`GREATEST(${cte.index}, ${index})`,
                ),
                eq(table.tenantId, tenantId),
              ),
            )
            .orderBy(asc(table.index))
            .for("update");
        })
        .pipe(Effect.map((statuses) => statuses as Array<WorkflowStatus>)),
  );

  const findTailSliceByIdForUpdate = Effect.fn(
    "WorkflowStatuses.Repository.findTailSliceByIdForUpdate",
  )((id: WorkflowStatus["id"], tenantId: WorkflowStatus["tenantId"]) =>
    db.useTransaction((tx) => {
      const cte = tx.$with("workflow_status").as(
        tx
          .select()
          .from(table)
          .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
          .limit(1),
      );

      return tx
        .with(cte)
        .select(getTableColumns(table))
        .from(table)
        .innerJoin(
          cte,
          or(
            eq(table.roomWorkflowId, cte.roomWorkflowId),
            eq(table.sharedAccountWorkflowId, cte.sharedAccountWorkflowId),
          ),
        )
        .where(and(gte(table.index, cte.index), eq(table.tenantId, tenantId)))
        .for("update");
    }),
  );

  const negateMany = Effect.fn("WorkflowStatuses.Repository.negateMany")(
    (ids: ReadonlyArray<WorkflowStatus["id"]>, tenantId: WorkflowStatus["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set({ index: sql`-${table.index}` })
            .where(and(inArray(table.id, ids), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map((statuses) => statuses as Array<WorkflowStatus>)),
  );

  const updateById = Effect.fn("WorkflowStatuses.Repository.updateById")(
    (
      id: WorkflowStatus["id"],
      workflowStatus: Partial<Omit<WorkflowStatus, "id" | "tenantId">>,
      tenantId: WorkflowStatus["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(workflowStatus)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((status) => status as WorkflowStatus),
        ),
  );

  const deleteById = Effect.fn("WorkflowStatuses.Repository.deleteById")(
    (id: WorkflowStatus["id"], tenantId: WorkflowStatus["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .delete(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((status) => status as WorkflowStatus),
        ),
  );

  return {
    create,
    upsertMany,
    findCreates,
    findActiveCreates,
    findActiveCustomerAuthorizedSharedAccountCreates,
    findActiveManagerAuthorizedSharedAccountCreates,
    findActivePublishedRoomCreates,
    findUpdates,
    findActiveUpdates,
    findActiveCustomerAuthorizedSharedAccountUpdates,
    findActiveManagerAuthorizedSharedAccountUpdates,
    findActivePublishedRoomUpdates,
    findDeletes,
    findActiveDeletes,
    findActiveCustomerAuthorizedSharedAccountDeletes,
    findActiveManagerAuthorizedSharedAccountDeletes,
    findActivePublishedRoomDeletes,
    findFastForward,
    findActiveFastForward,
    findActiveCustomerAuthorizedSharedAccountFastForward,
    findActiveManagerAuthorizedSharedAccountFastForward,
    findActivePublishedRoomFastForward,
    findById,
    findLastByWorkflowId,
    findSliceForUpdate,
    findTailSliceByIdForUpdate,
    negateMany,
    updateById,
    deleteById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(WorkflowStatusesRepository));
