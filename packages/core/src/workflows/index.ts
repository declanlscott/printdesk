import {
  and,
  asc,
  between,
  desc,
  eq,
  getTableColumns,
  getTableName,
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
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Ordering from "effect/Ordering";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Actors } from "../actors";
import { Database } from "../database";
import { Events } from "../events";
import { MutationsContract } from "../mutations/contract";
import { Orders } from "../orders";
import { PoliciesContract } from "../policies/contract";
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache";
import { ReplicacheNotifier } from "../replicache/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache/schemas";
import {
  SharedAccountWorkflowsContract,
  WorkflowStatusesContract,
} from "./contracts";
import {
  RoomWorkflowsSchema,
  SharedAccountWorkflowsSchema,
  WorkflowStatusesSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";
import type { ColumnsContract } from "../columns/contract";
import type { ReplicacheClientViewsSchema } from "../replicache/schemas";

export namespace RoomWorkflows {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/workflows/RoomsRepository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = RoomWorkflowsSchema.table.definition;
        const activeView = RoomWorkflowsSchema.activeView;
        const activePublishedRoomView =
          RoomWorkflowsSchema.activePublishedRoomView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn("RoomWorkflows.Repository.create")(
          (roomWorkflow: InferInsertModel<RoomWorkflowsSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(roomWorkflow).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("RoomWorkflows.Repository.findCreates")(
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
                        .where(eq(table.tenantId, clientView.tenantId)),
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

        const findActiveCreates = Effect.fn(
          "RoomWorkflows.Repository.findActiveCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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

        const findActivePublishedRoomCreates = Effect.fn(
          "RoomWorkflows.Repository.findActivePublishedRoomCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activePublishedRoomView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activePublishedRoomView)
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
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

        const findUpdates = Effect.fn("RoomWorkflows.Repository.findUpdates")(
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
                            eq(entriesTable.tenantId, table.tenantId),
                          ),
                        )
                        .where(eq(table.tenantId, clientView.tenantId)),
                    );

                  return tx
                    .with(cte)
                    .select(cte[getTableName(table)])
                    .from(cte);
                }),
              ),
            ),
        );

        const findActiveUpdates = Effect.fn(
          "RoomWorkflows.Repository.findActiveUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activeView)])
                  .from(cte);
              }),
            ),
          ),
        );

        const findActivePublishedRoomUpdates = Effect.fn(
          "RoomWorkflows.Repository.findActivePublishedRoomUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(
                              entriesTable.entityVersion,
                              activePublishedRoomView.version,
                            ),
                          ),
                          eq(
                            entriesTable.tenantId,
                            activePublishedRoomView.tenantId,
                          ),
                        ),
                      )
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activePublishedRoomView)])
                  .from(cte);
              }),
            ),
          ),
        );

        const findDeletes = Effect.fn("RoomWorkflows.Repository.findDeletes")(
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
                        .where(eq(table.tenantId, clientView.tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "RoomWorkflows.Repository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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

        const findActivePublishedRoomDeletes = Effect.fn(
          "RoomWorkflows.Repository.findActivePublishedRoomDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
            .pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activePublishedRoomView.id })
                      .from(activePublishedRoomView)
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findFastForward = Effect.fn(
          "RoomWorkflows.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<RoomWorkflowsSchema.Row["id"]>,
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
                          .where(eq(table.tenantId, clientView.tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "RoomWorkflows.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<RoomWorkflowsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedRoomFastForward = Effect.fn(
          "RoomWorkflows.Repository.findActivePublishedRoomFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<RoomWorkflowsSchema.Row["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activePublishedRoomView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activePublishedRoomView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              notInArray(
                                activePublishedRoomView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            eq(
                              activePublishedRoomView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn("RoomWorkflows.Repository.findById")(
          (
            id: RoomWorkflowsSchema.Row["id"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findActivePublishedById = Effect.fn(
          "RoomsWorkflows.Repository.findActivePublishedById",
        )(
          (
            id: RoomWorkflowsSchema.Row["id"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(activePublishedRoomView)
                  .where(
                    and(
                      eq(activePublishedRoomView.id, id),
                      eq(activePublishedRoomView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateByRoomId = Effect.fn(
          "RoomWorkflows.Repository.updateByRoomId",
        )(
          (
            roomId: RoomWorkflowsSchema.Row["roomId"],
            roomWorkflow: Partial<
              Omit<RoomWorkflowsSchema.Row, "id" | "roomID" | "tenantId">
            >,
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(roomWorkflow)
                  .where(
                    and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActivePublishedRoomCreates,
          findUpdates,
          findActiveUpdates,
          findActivePublishedRoomUpdates,
          findDeletes,
          findActiveDeletes,
          findActivePublishedRoomDeletes,
          findFastForward,
          findActiveFastForward,
          findActivePublishedRoomFastForward,
          findById,
          findActivePublishedById,
          updateByRoomId,
        } as const;
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/workflows/RoomsQueries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(RoomWorkflowsSchema.table.definition),
          )
            .query(AccessControl.permission("room_workflows:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_room_workflows:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission("active_published_room_workflows:read"),
              {
                findCreates: repository.findActivePublishedRoomCreates,
                findUpdates: repository.findActivePublishedRoomUpdates,
                findDeletes: repository.findActivePublishedRoomDeletes,
                fastForward: repository.findActivePublishedRoomFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}
}

export namespace SharedAccountWorkflows {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/workflows/SharedAccountsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountWorkflowsSchema.table.definition;
        const activeView = SharedAccountWorkflowsSchema.activeView;
        const activeCustomerAuthorizedView =
          SharedAccountWorkflowsSchema.activeCustomerAuthorizedView;
        const activeManagerAuthorizedView =
          SharedAccountWorkflowsSchema.activeManagerAuthorizedView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn("SharedAccountWorkflows.Repository.create")(
          (workflow: InferInsertModel<SharedAccountWorkflowsSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(workflow).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn(
          "SharedAccountWorkflows.Repository.findCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getTableName(table)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(table)
                      .where(eq(table.tenantId, clientView.tenantId)),
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

        const findActiveCreates = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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

        const findActiveCustomerAuthorizedCreates = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeCustomerAuthorizedView.id,
                            activeCustomerAuthorizedView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(activeCustomerAuthorizedView),
                            "customerId",
                          ),
                        )
                        .from(activeCustomerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
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

        const findActiveManagerAuthorizedCreates = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveManagerAuthorizedCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeManagerAuthorizedView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeManagerAuthorizedView.id,
                            activeManagerAuthorizedView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(activeManagerAuthorizedView),
                            "managerId",
                          ),
                        )
                        .from(activeManagerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
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

        const findUpdates = Effect.fn(
          "SharedAccountWorkflows.Repository.findUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
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
                          eq(entriesTable.tenantId, table.tenantId),
                        ),
                      )
                      .where(eq(table.tenantId, clientView.tenantId)),
                  );

                return tx.with(cte).select(cte[getTableName(table)]).from(cte);
              }),
            ),
          ),
        );

        const findActiveUpdates = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activeView)])
                  .from(cte);
              }),
            ),
          ),
        );

        const findActiveCustomerAuthorizedUpdates = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeCustomerAuthorizedView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeCustomerAuthorizedView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeCustomerAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeCustomerAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
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
                      Struct.omit(
                        cte[getViewName(activeCustomerAuthorizedView)],
                        "customerId",
                      ),
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeManagerAuthorizedView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeManagerAuthorizedView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeManagerAuthorizedView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeManagerAuthorizedView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeManagerAuthorizedView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedView.tenantId,
                              clientView.tenantId,
                            ),
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
                      Struct.omit(
                        cte[getViewName(activeManagerAuthorizedView)],
                        "managerId",
                      ),
                    )
                    .from(cte);
                }),
              ),
            ),
        );

        const findDeletes = Effect.fn(
          "SharedAccountWorkflows.Repository.findDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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
          "SharedAccountWorkflows.Repository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeCustomerAuthorizedView.id })
                      .from(activeCustomerAuthorizedView)
                      .where(
                        and(
                          eq(
                            activeCustomerAuthorizedView.customerId,
                            customerId,
                          ),
                          eq(
                            activeCustomerAuthorizedView.tenantId,
                            clientView.tenantId,
                          ),
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activeManagerAuthorizedView.id })
                      .from(activeManagerAuthorizedView)
                      .where(
                        and(
                          eq(activeManagerAuthorizedView.managerId, managerId),
                          eq(
                            activeManagerAuthorizedView.tenantId,
                            clientView.tenantId,
                          ),
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findFastForward = Effect.fn(
          "SharedAccountWorkflows.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountWorkflowsSchema.Row["id"]>,
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
                          .where(eq(table.tenantId, clientView.tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<SharedAccountWorkflowsSchema.ActiveRow["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedFastForward = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["id"]
            >,
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeCustomerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerAuthorizedView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeCustomerAuthorizedView.id,
                              ),
                              notInArray(
                                activeCustomerAuthorizedView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[getViewName(activeCustomerAuthorizedView)].id,
                          cte[getViewName(activeCustomerAuthorizedView)]
                            .tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeCustomerAuthorizedView)],
                          "customerId",
                        ),
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
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["id"]
            >,
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["managerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagerAuthorizedView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagerAuthorizedView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeManagerAuthorizedView.id,
                              ),
                              notInArray(
                                activeManagerAuthorizedView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedView.managerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[getViewName(activeManagerAuthorizedView)].id,
                          cte[getViewName(activeManagerAuthorizedView)]
                            .tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeManagerAuthorizedView)],
                          "managerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findById = Effect.fn(
          "SharedAccountWorkflows.Repository.findById",
        )(
          (
            id: SharedAccountWorkflowsSchema.Row["id"],
            tenantId: SharedAccountWorkflowsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findActiveCustomerAuthorized = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveCustomerAuthorized",
        )(
          (
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["customerId"],
            id: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["id"],
            tenantId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["tenantId"],
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
              .pipe(Effect.flatMap(Array.head)),
        );

        const findActiveManagerAuthorized = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveManagerAuthorized",
        )(
          (
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["managerId"],
            id: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["id"],
            tenantId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["tenantId"],
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
              .pipe(Effect.flatMap(Array.head)),
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
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/workflows/SharedAccountsQueries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(SharedAccountWorkflowsSchema.table.definition),
          )
            .query(AccessControl.permission("shared_account_workflows:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(
              AccessControl.permission("active_shared_account_workflows:read"),
              {
                findCreates: repository.findActiveCreates,
                findUpdates: repository.findActiveUpdates,
                findDeletes: repository.findActiveDeletes,
                fastForward: repository.findActiveFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_customer_authorized_shared_account_workflows:read",
              ),
              {
                findCreates: repository.findActiveCustomerAuthorizedCreates,
                findUpdates: repository.findActiveCustomerAuthorizedUpdates,
                findDeletes: repository.findActiveCustomerAuthorizedDeletes,
                fastForward: repository.findActiveCustomerAuthorizedFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_manager_authorized_shared_account_workflows:read",
              ),
              {
                findCreates: repository.findActiveManagerAuthorizedCreates,
                findUpdates: repository.findActiveManagerAuthorizedUpdates,
                findDeletes: repository.findActiveManagerAuthorizedDeletes,
                fastForward: repository.findActiveManagerAuthorizedFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/workflows/SharedAccountPolicies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isCustomerAuthorized = PoliciesContract.makePolicy(
          SharedAccountWorkflowsContract.isCustomerAuthorized,
          {
            make: Effect.fn(
              "SharedAccountWorkflows.Policies.isCustomerAuthorized",
            )(({ id }) =>
              AccessControl.userPolicy(
                {
                  name: SharedAccountWorkflowsContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findActiveCustomerAuthorized(user.id, id, user.tenantId)
                    .pipe(
                      Effect.andThen(true),
                      Effect.catchTag("NoSuchElementException", () =>
                        Effect.succeed(false),
                      ),
                    ),
              ),
            ),
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          SharedAccountWorkflowsContract.isManagerAuthorized,
          {
            make: Effect.fn(
              "SharedAccountWorkflows.Policies.isManagerAuthorized.make",
            )(({ id }) =>
              AccessControl.userPolicy(
                {
                  name: SharedAccountWorkflowsContract.Table.name,
                  id,
                },
                (user) =>
                  repository
                    .findActiveManagerAuthorized(user.id, id, user.tenantId)
                    .pipe(
                      Effect.andThen(true),
                      Effect.catchTag("NoSuchElementException", () =>
                        Effect.succeed(false),
                      ),
                    ),
              ),
            ),
          },
        );

        return { isCustomerAuthorized, isManagerAuthorized } as const;
      }),
    },
  ) {}
}

export namespace WorkflowStatuses {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/workflows/StatusesRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = WorkflowStatusesSchema.table.definition;
        const activeView = WorkflowStatusesSchema.activeView;
        const activeCustomerAuthorizedSharedAccountView =
          WorkflowStatusesSchema.activeCustomerAuthorizedSharedAccountView;
        const activeManagerAuthorizedSharedAccountView =
          WorkflowStatusesSchema.activeManagerAuthorizedSharedAccountView;
        const activePublishedRoomView =
          WorkflowStatusesSchema.activePublishedRoomView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn("WorkflowStatuses.Repository.create")(
          (workflowStatus: InferInsertModel<WorkflowStatusesSchema.Table>) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .insert(table)
                    .values(workflowStatus)
                    .returning() as Promise<Array<WorkflowStatusesSchema.Row>>,
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const upsertMany = Effect.fn("WorkflowStatuses.Repository.upsertMany")(
          (
            workflowStatuses: Array<
              InferInsertModel<WorkflowStatusesSchema.Table>
            >,
          ) =>
            db.useTransaction(
              (tx) =>
                tx
                  .insert(table)
                  .values(workflowStatuses)
                  .onConflictDoUpdate({
                    target: [table.id, table.tenantId],
                    set: WorkflowStatusesSchema.table.conflictSet,
                  })
                  .returning() as Promise<Array<WorkflowStatusesSchema.Row>>,
            ),
        );

        const findCreates = Effect.fn(
          "WorkflowStatuses.Repository.findCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getTableName(table)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(table)
                      .where(eq(table.tenantId, clientView.tenantId)),
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
                  ) as Promise<Array<WorkflowStatusesSchema.Row>>;
              }),
            ),
          ),
        );

        const findActiveCreates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activeView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activeView)
                      .where(eq(activeView.tenantId, clientView.tenantId)),
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
                  ) as Promise<Array<WorkflowStatusesSchema.ActiveRow>>;
              }),
            ),
          ),
        );

        const findActiveCustomerAuthorizedSharedAccountCreates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedSharedAccountView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeCustomerAuthorizedSharedAccountView.id,
                            activeCustomerAuthorizedSharedAccountView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(
                              activeCustomerAuthorizedSharedAccountView,
                            ),
                            "customerId",
                          ),
                        )
                        .from(activeCustomerAuthorizedSharedAccountView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedSharedAccountView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedSharedAccountView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
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
                    ) as Promise<
                    Array<
                      Omit<
                        WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow,
                        "customerId"
                      >
                    >
                  >;
                }),
              ),
            ),
        );

        const findActiveManagerAuthorizedSharedAccountCreates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["managerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeManagerAuthorizedSharedAccountView)}_creates`,
                    )
                    .as(
                      tx
                        .selectDistinctOn(
                          [
                            activeManagerAuthorizedSharedAccountView.id,
                            activeManagerAuthorizedSharedAccountView.tenantId,
                          ],
                          Struct.omit(
                            getViewSelectedFields(
                              activeManagerAuthorizedSharedAccountView,
                            ),
                            "managerId",
                          ),
                        )
                        .from(activeManagerAuthorizedSharedAccountView)
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedSharedAccountView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedSharedAccountView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
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
                    ) as Promise<
                    Array<
                      Omit<
                        WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow,
                        "managerId"
                      >
                    >
                  >;
                }),
              ),
            ),
        );

        const findActivePublishedRoomCreates = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomCreates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
            Effect.flatMap((qb) =>
              db.useTransaction((tx) => {
                const cte = tx
                  .$with(`${getViewName(activePublishedRoomView)}_creates`)
                  .as(
                    tx
                      .select()
                      .from(activePublishedRoomView)
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
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
                  ) as Promise<
                  Array<WorkflowStatusesSchema.ActivePublishedRoomRow>
                >;
              }),
            ),
          ),
        );

        const findUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
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
                          eq(entriesTable.tenantId, table.tenantId),
                        ),
                      )
                      .where(eq(table.tenantId, clientView.tenantId)),
                  );

                return tx
                  .with(cte)
                  .select(cte[getTableName(table)])
                  .from(cte) as Promise<Array<WorkflowStatusesSchema.Row>>;
              }),
            ),
          ),
        );

        const findActiveUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(entriesTable.entityVersion, activeView.version),
                          ),
                          eq(entriesTable.tenantId, activeView.tenantId),
                        ),
                      )
                      .where(eq(activeView.tenantId, clientView.tenantId)),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activeView)])
                  .from(cte) as Promise<
                  Array<WorkflowStatusesSchema.ActiveRow>
                >;
              }),
            ),
          ),
        );

        const findActiveCustomerAuthorizedSharedAccountUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeCustomerAuthorizedSharedAccountView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeCustomerAuthorizedSharedAccountView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeCustomerAuthorizedSharedAccountView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeCustomerAuthorizedSharedAccountView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeCustomerAuthorizedSharedAccountView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedSharedAccountView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedSharedAccountView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .selectDistinctOn(
                      [
                        cte[
                          getViewName(activeCustomerAuthorizedSharedAccountView)
                        ].id,
                        cte[
                          getViewName(activeCustomerAuthorizedSharedAccountView)
                        ].tenantId,
                      ],
                      Struct.omit(
                        cte[
                          getViewName(activeCustomerAuthorizedSharedAccountView)
                        ],
                        "customerId",
                      ),
                    )
                    .from(cte) as Promise<
                    Array<
                      Omit<
                        WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow,
                        "customerId"
                      >
                    >
                  >;
                }),
              ),
            ),
        );

        const findActiveManagerAuthorizedSharedAccountUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["managerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) => {
                  const cte = tx
                    .$with(
                      `${getViewName(activeManagerAuthorizedSharedAccountView)}_updates`,
                    )
                    .as(
                      qb
                        .innerJoin(
                          activeManagerAuthorizedSharedAccountView,
                          and(
                            eq(
                              entriesTable.entityId,
                              activeManagerAuthorizedSharedAccountView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeManagerAuthorizedSharedAccountView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
                              activeManagerAuthorizedSharedAccountView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedSharedAccountView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedSharedAccountView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                        ),
                    );

                  return tx
                    .with(cte)
                    .selectDistinctOn(
                      [
                        cte[
                          getViewName(activeManagerAuthorizedSharedAccountView)
                        ].id,
                        cte[
                          getViewName(activeManagerAuthorizedSharedAccountView)
                        ].tenantId,
                      ],
                      Struct.omit(
                        cte[
                          getViewName(activeManagerAuthorizedSharedAccountView)
                        ],
                        "managerId",
                      ),
                    )
                    .from(cte) as Promise<
                    Array<
                      Omit<
                        WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow,
                        "managerId"
                      >
                    >
                  >;
                }),
              ),
            ),
        );

        const findActivePublishedRoomUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomUpdates",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                          not(
                            eq(
                              entriesTable.entityVersion,
                              activePublishedRoomView.version,
                            ),
                          ),
                          eq(
                            entriesTable.tenantId,
                            activePublishedRoomView.tenantId,
                          ),
                        ),
                      )
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
                  );

                return tx
                  .with(cte)
                  .select(cte[getViewName(activePublishedRoomView)])
                  .from(cte) as Promise<
                  Array<WorkflowStatusesSchema.ActivePublishedRoomRow>
                >;
              }),
            ),
          ),
        );

        const findDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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
          "WorkflowStatuses.Repository.findActiveDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
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
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
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
                          eq(
                            activeCustomerAuthorizedSharedAccountView.customerId,
                            customerId,
                          ),
                          eq(
                            activeCustomerAuthorizedSharedAccountView.tenantId,
                            clientView.tenantId,
                          ),
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["managerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
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
                          eq(
                            activeManagerAuthorizedSharedAccountView.managerId,
                            managerId,
                          ),
                          eq(
                            activeManagerAuthorizedSharedAccountView.tenantId,
                            clientView.tenantId,
                          ),
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findActivePublishedRoomDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomDeletes",
        )((clientView: ReplicacheClientViewsSchema.Row) =>
          entriesQueryBuilder
            .deletes(getTableName(table), clientView)
            .pipe(
              Effect.flatMap((qb) =>
                db.useTransaction((tx) =>
                  qb.except(
                    tx
                      .select({ id: activePublishedRoomView.id })
                      .from(activePublishedRoomView)
                      .where(
                        eq(
                          activePublishedRoomView.tenantId,
                          clientView.tenantId,
                        ),
                      ),
                  ),
                ),
              ),
            ),
        );

        const findFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<WorkflowStatusesSchema.Row["id"]>,
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
                          .where(eq(table.tenantId, clientView.tenantId)),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte) as Promise<Array<WorkflowStatusesSchema.Row>>;
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<WorkflowStatusesSchema.ActiveRow["id"]>,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
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

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeView)])
                      .from(cte) as Promise<
                      Array<WorkflowStatusesSchema.ActiveRow>
                    >;
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedSharedAccountFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["id"]
            >,
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeCustomerAuthorizedSharedAccountView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerAuthorizedSharedAccountView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeCustomerAuthorizedSharedAccountView.id,
                              ),
                              notInArray(
                                activeCustomerAuthorizedSharedAccountView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedSharedAccountView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedSharedAccountView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[
                            getViewName(
                              activeCustomerAuthorizedSharedAccountView,
                            )
                          ].id,
                          cte[
                            getViewName(
                              activeCustomerAuthorizedSharedAccountView,
                            )
                          ].tenantId,
                        ],
                        Struct.omit(
                          cte[
                            getViewName(
                              activeCustomerAuthorizedSharedAccountView,
                            )
                          ],
                          "customerId",
                        ),
                      )
                      .from(cte) as Promise<
                      Array<
                        Omit<
                          WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow,
                          "customerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findActiveManagerAuthorizedSharedAccountFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["id"]
            >,
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["managerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagerAuthorizedSharedAccountView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagerAuthorizedSharedAccountView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activeManagerAuthorizedSharedAccountView.id,
                              ),
                              notInArray(
                                activeManagerAuthorizedSharedAccountView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedSharedAccountView.managerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedSharedAccountView.tenantId,
                                clientView.tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .selectDistinctOn(
                        [
                          cte[
                            getViewName(
                              activeManagerAuthorizedSharedAccountView,
                            )
                          ].id,
                          cte[
                            getViewName(
                              activeManagerAuthorizedSharedAccountView,
                            )
                          ].tenantId,
                        ],
                        Struct.omit(
                          cte[
                            getViewName(
                              activeManagerAuthorizedSharedAccountView,
                            )
                          ],
                          "managerId",
                        ),
                      )
                      .from(cte) as Promise<
                      Array<
                        Omit<
                          WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow,
                          "managerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findActivePublishedRoomFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              WorkflowStatusesSchema.ActivePublishedRoomRow["id"]
            >,
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activePublishedRoomView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activePublishedRoomView,
                            and(
                              eq(
                                entriesTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              notInArray(
                                activePublishedRoomView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            eq(
                              activePublishedRoomView.tenantId,
                              clientView.tenantId,
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte) as Promise<
                      Array<WorkflowStatusesSchema.ActivePublishedRoomRow>
                    >;
                  }),
                ),
              ),
        );

        const findById = Effect.fn("WorkflowStatuses.Repository.findById")(
          (
            id: WorkflowStatusesSchema.Row["id"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .select()
                    .from(table)
                    .where(
                      and(eq(table.id, id), eq(table.tenantId, tenantId)),
                    ) as Promise<Array<WorkflowStatusesSchema.Row>>,
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findLastByWorkflowId = Effect.fn(
          "WorkflowStatuses.Repository.findLastByWorkflowId",
        )(
          (
            workflowId: ColumnsContract.EntityId,
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
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
                    .limit(1) as Promise<Array<WorkflowStatusesSchema.Row>>,
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findSliceForUpdate = Effect.fn(
          "WorkflowStatuses.Repository.findSliceForUpdate",
        )(
          (
            id: WorkflowStatusesSchema.Row["id"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
            index: WorkflowStatusesSchema.Row["index"],
          ) =>
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
                    eq(
                      table.sharedAccountWorkflowId,
                      cte.sharedAccountWorkflowId,
                    ),
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
                .for("update") as Promise<Array<WorkflowStatusesSchema.Row>>;
            }),
        );

        const findTailSliceByIdForUpdate = Effect.fn(
          "WorkflowStatuses.Repository.findTailSliceByIdForUpdate",
        )(
          (
            id: WorkflowStatusesSchema.Row["id"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
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
                    eq(
                      table.sharedAccountWorkflowId,
                      cte.sharedAccountWorkflowId,
                    ),
                  ),
                )
                .where(
                  and(
                    gte(table.index, cte.index),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .for("update");
            }),
        );

        const negateMany = Effect.fn("WorkflowStatuses.Repository.negateMany")(
          (
            ids: ReadonlyArray<WorkflowStatusesSchema.Row["id"]>,
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db.useTransaction(
              (tx) =>
                tx
                  .update(table)
                  .set({ index: sql`-${table.index}` })
                  .where(
                    and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                  )
                  .returning() as Promise<Array<WorkflowStatusesSchema.Row>>,
            ),
        );

        const updateById = Effect.fn("WorkflowStatuses.Repository.updateById")(
          (
            id: WorkflowStatusesSchema.Row["id"],
            workflowStatus: Partial<
              Omit<WorkflowStatusesSchema.Row, "id" | "tenantId">
            >,
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .update(table)
                    .set(workflowStatus)
                    .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                    .returning() as Promise<Array<WorkflowStatusesSchema.Row>>,
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("WorkflowStatuses.Repository.deleteById")(
          (
            id: WorkflowStatusesSchema.Row["id"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .delete(table)
                    .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                    .returning() as Promise<Array<WorkflowStatusesSchema.Row>>,
              )
              .pipe(Effect.flatMap(Array.head)),
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
      }),
    },
  ) {}

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/workflows/StatusesQueries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder(
            getTableName(WorkflowStatusesSchema.table.definition),
          )
            .query(AccessControl.permission("workflow_statuses:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_workflow_statuses:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission(
                "active_customer_authorized_shared_account_workflow_statuses:read",
              ),
              {
                findCreates:
                  repository.findActiveCustomerAuthorizedSharedAccountCreates,
                findUpdates:
                  repository.findActiveCustomerAuthorizedSharedAccountUpdates,
                findDeletes:
                  repository.findActiveCustomerAuthorizedSharedAccountDeletes,
                fastForward:
                  repository.findActiveCustomerAuthorizedSharedAccountFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_manager_authorized_shared_account_workflow_statuses:read",
              ),
              {
                findCreates:
                  repository.findActiveManagerAuthorizedSharedAccountCreates,
                findUpdates:
                  repository.findActiveManagerAuthorizedSharedAccountUpdates,
                findDeletes:
                  repository.findActiveManagerAuthorizedSharedAccountDeletes,
                fastForward:
                  repository.findActiveManagerAuthorizedSharedAccountFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_published_room_workflow_statuses:read",
              ),
              {
                findCreates: repository.findActivePublishedRoomCreates,
                findUpdates: repository.findActivePublishedRoomUpdates,
                findDeletes: repository.findActivePublishedRoomDeletes,
                fastForward: repository.findActivePublishedRoomFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/workflows/StatusesPolicies",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Orders.Repository.Default,
        SharedAccountWorkflows.Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const ordersRepository = yield* Orders.Repository;

        const sharedAccountWorkflowPolicies =
          yield* SharedAccountWorkflows.Policies;

        const canEdit = PoliciesContract.makePolicy(
          WorkflowStatusesContract.canEdit,
          {
            make: Effect.fn("WorkflowStatuses.Policies.canEdit.make")(
              ({ id }) =>
                Actors.Actor.pipe(
                  Effect.flatMap(Struct.get("assertPrivate")),
                  Effect.flatMap(({ tenantId }) =>
                    repository.findById(id, tenantId).pipe(
                      Effect.flatMap((workflowStatus) =>
                        Match.value(workflowStatus).pipe(
                          Match.when({ roomWorkflowId: Match.null }, (s) =>
                            sharedAccountWorkflowPolicies.isManagerAuthorized.make(
                              { id: s.sharedAccountWorkflowId },
                            ),
                          ),
                          Match.orElse(() =>
                            AccessControl.permission("rooms:update"),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          WorkflowStatusesContract.canDelete,
          {
            make: Effect.fn("WorkflowStatuses.Policies.canDelete.make")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.privatePolicy(
                    {
                      name: WorkflowStatusesContract.Table.name,
                      id,
                    },
                    ({ tenantId }) =>
                      ordersRepository
                        .findByWorkflowStatusId(id, tenantId)
                        .pipe(Effect.map(Array.isEmptyArray)),
                  ),
                  canEdit.make({ id }),
                ),
            ),
          },
        );

        return { canEdit, canDelete } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/workflows/StatusesMutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        RoomWorkflows.Repository.Default,
        SharedAccountWorkflows.Policies.Default,
        Policies.Default,
        ReplicacheNotifier.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const roomWorkflowsRepository = yield* RoomWorkflows.Repository;

        const sharedAccountWorkflowPolicies =
          yield* SharedAccountWorkflows.Policies;
        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyAppend = (
          workflowStatus: typeof WorkflowStatusesContract.Table.DataTransferObject.Type,
        ) =>
          Match.value(workflowStatus).pipe(
            Match.when({ roomWorkflowId: Match.null }, (s) =>
              Effect.succeed(
                Array.make(
                  PullPermission.make({
                    permission: "workflow_statuses:read",
                  }),
                  PullPermission.make({
                    permission: "active_workflow_statuses:read",
                  }),
                  Events.makeReplicachePullPolicy(
                    SharedAccountWorkflowsContract.isCustomerAuthorized.make({
                      id: s.sharedAccountWorkflowId,
                    }),
                  ),
                  Events.makeReplicachePullPolicy(
                    SharedAccountWorkflowsContract.isManagerAuthorized.make({
                      id: s.sharedAccountWorkflowId,
                    }),
                  ),
                ),
              ),
            ),
            Match.orElse((s) =>
              roomWorkflowsRepository
                .findActivePublishedById(s.roomWorkflowId, s.tenantId)
                .pipe(
                  Effect.andThen(
                    Array.make(
                      PullPermission.make({
                        permission: "workflow_statuses:read",
                      }),
                      PullPermission.make({
                        permission: "active_workflow_statuses:read",
                      }),
                      PullPermission.make({
                        permission:
                          "active_published_room_workflow_statuses:read",
                      }),
                    ),
                  ),
                  Effect.catchTag("NoSuchElementException", () =>
                    Effect.succeed(
                      Array.make(
                        PullPermission.make({
                          permission: "workflow_statuses:read",
                        }),
                        PullPermission.make({
                          permission: "active_workflow_statuses:read",
                        }),
                      ),
                    ),
                  ),
                ),
            ),
            Effect.flatMap(notifier.notify),
          );
        const notifyEdit = notifyAppend;
        const notifyDelete = notifyAppend;
        const notifyReorder = notifyAppend;

        const append = MutationsContract.makeMutation(
          WorkflowStatusesContract.append,
          {
            makePolicy: Effect.fn(
              "WorkflowStatuses.Mutations.append.makePolicy",
            )((workflowStatus) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:create"),
                Match.value(workflowStatus).pipe(
                  Match.when({ roomWorkflowId: Match.null }, (workflowStatus) =>
                    sharedAccountWorkflowPolicies.isManagerAuthorized.make({
                      id: workflowStatus.sharedAccountWorkflowId,
                    }),
                  ),
                  Match.orElse(() => AccessControl.permission("rooms:update")),
                ),
              ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutation.append.mutator")(
              (workflowStatus, { tenantId }) =>
                repository
                  .findLastByWorkflowId(
                    workflowStatus.roomWorkflowId ??
                      workflowStatus.sharedAccountWorkflowId,
                    tenantId,
                  )
                  .pipe(
                    Effect.map(Struct.get("index")),
                    Effect.map(Number.increment),
                    Effect.catchTag("NoSuchElementException", () =>
                      Effect.succeed(0),
                    ),
                    Effect.flatMap((index) =>
                      repository.create({ ...workflowStatus, index, tenantId }),
                    ),
                    Effect.tap(notifyAppend),
                  ),
            ),
          },
        );

        const edit = MutationsContract.makeMutation(
          WorkflowStatusesContract.edit,
          {
            makePolicy: Effect.fn("WorkflowStatuses.Mutations.edit.makePolicy")(
              ({ id }) =>
                AccessControl.some(
                  AccessControl.permission("workflow_statuses:update"),
                  policies.canEdit.make({ id }),
                ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutations.edit.mutator")(
              ({ id, ...workflowStatus }, user) =>
                repository
                  .updateById(id, workflowStatus, user.tenantId)
                  .pipe(Effect.tap(notifyEdit)),
            ),
          },
        );

        const reorder = MutationsContract.makeMutation(
          WorkflowStatusesContract.reorder,
          {
            makePolicy: Effect.fn(
              "WorkflowStatuses.Mutations.reorder.makePolicy",
            )(({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:update"),
                policies.canEdit.make({ id }),
              ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutations.reorder.mutator")(
              ({ id, index, updatedAt }, user) =>
                Effect.gen(function* () {
                  const slice = yield* repository
                    .findSliceForUpdate(id, user.tenantId, index)
                    .pipe(
                      Effect.flatMap((slice) =>
                        Array.last(slice).pipe(
                          Effect.map((status) =>
                            status.id === id ? Array.reverse(slice) : slice,
                          ),
                        ),
                      ),
                    );

                  const delta = yield* Array.head(slice).pipe(
                    Effect.map(Struct.get("index")),
                    Effect.map(Number.subtract(index)),
                    Effect.map(Number.negate),
                  );
                  const shift = Ordering.reverse(Number.sign(delta));

                  if (!shift)
                    return yield* new Cause.IllegalArgumentException(
                      `Invalid workflow status index, delta with existing index must be non-zero.`,
                    );

                  const actualDelta = (slice.length - 1) * -shift;
                  if (delta !== actualDelta)
                    return yield* new Cause.IllegalArgumentException(
                      `Invalid workflow status index, delta mismatch. Delta: ${delta}, actual delta: ${actualDelta}.`,
                    );

                  // Temporarily negate indexes to avoid uniqueness violations during upsert
                  yield* repository.negateMany(
                    Array.map(slice, Struct.get("id")),
                    user.tenantId,
                  );

                  return yield* repository.upsertMany(
                    Array.map(slice, (status, i) => ({
                      ...status,
                      index: status.index + (i === 0 ? delta : shift),
                      updatedAt,
                    })),
                  );
                }).pipe(
                  Effect.tap((changed) =>
                    Array.head(changed).pipe(Effect.map(notifyReorder)),
                  ),
                ),
            ),
          },
        );

        const delete_ = MutationsContract.makeMutation(
          WorkflowStatusesContract.delete_,
          {
            makePolicy: Effect.fn(
              "WorkflowStatuses.Mutations.delete.makePolicy",
            )(({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:delete"),
                policies.canDelete.make({ id }),
              ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutations.delete.mutator")(
              ({ id, deletedAt }, user) =>
                Effect.gen(function* () {
                  const slice = yield* repository.findTailSliceByIdForUpdate(
                    id,
                    user.tenantId,
                  );

                  const deleted = yield* repository.deleteById(
                    id,
                    user.tenantId,
                  );

                  yield* repository.upsertMany(
                    Array.filterMap(slice, (status, i) =>
                      i === 0
                        ? Option.none()
                        : Option.some({
                            ...status,
                            index: status.index - 1,
                            updatedAt: deletedAt,
                          }),
                    ),
                  );

                  return deleted;
                }).pipe(Effect.tap(notifyDelete)),
            ),
          },
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
