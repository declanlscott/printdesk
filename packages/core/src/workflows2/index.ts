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
import {
  Array,
  Cause,
  Effect,
  Match,
  Number,
  Option,
  Ordering,
  Struct,
} from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Orders } from "../orders2";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
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
import type { ColumnsContract } from "../columns2/contract";

export namespace RoomWorkflows {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/workflows/RoomsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = RoomWorkflowsSchema.table.definition;
        const activeView = RoomWorkflowsSchema.activeView;
        const activePublishedRoomView =
          RoomWorkflowsSchema.activePublishedRoomView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedRoomView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activePublishedRoomView)
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
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
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeView.version,
                                ),
                              ),
                              eq(metadataTable.tenantId, activeView.tenantId),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedRoomView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedRoomView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePublishedRoomView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePublishedRoomView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
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
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "RoomWorkflows.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActivePublishedRoomDeletes = Effect.fn(
          "RoomWorkflows.Repository.findActivePublishedRoomDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activePublishedRoomView.id })
                        .from(activePublishedRoomView)
                        .where(eq(activePublishedRoomView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "RoomWorkflows.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<RoomWorkflowsSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<RoomWorkflowsSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: RoomWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<RoomWorkflowsSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                                metadataTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              notInArray(
                                activePublishedRoomView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
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
          updateByRoomId,
        } as const;
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
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = SharedAccountWorkflowsSchema.table.definition;
        const activeView = SharedAccountWorkflowsSchema.activeView;
        const activeCustomerAuthorizedView =
          SharedAccountWorkflowsSchema.activeCustomerAuthorizedView;
        const activeManagerAuthorizedView =
          SharedAccountWorkflowsSchema.activeManagerAuthorizedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
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
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
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
                              getViewSelectedFields(
                                activeCustomerAuthorizedView,
                              ),
                              "authorizedCustomerId",
                            ),
                          )
                          .from(activeCustomerAuthorizedView)
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedView.authorizedCustomerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedView.tenantId,
                                tenantId,
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
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
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
                              getViewSelectedFields(
                                activeManagerAuthorizedView,
                              ),
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagerAuthorizedView)
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedView.tenantId,
                                tenantId,
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
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
          "SharedAccountWorkflows.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeView.version,
                                ),
                              ),
                              eq(metadataTable.tenantId, activeView.tenantId),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
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
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeCustomerAuthorizedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeCustomerAuthorizedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeCustomerAuthorizedView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedView.authorizedCustomerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedView.tenantId,
                                tenantId,
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
                          "authorizedCustomerId",
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
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeManagerAuthorizedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagerAuthorizedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagerAuthorizedView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedView.tenantId,
                                tenantId,
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
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn(
          "SharedAccountWorkflows.Repository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.Row["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveCustomerAuthorizedDeletes = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveCustomerAuthorizedDeletes",
        )(
          (
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeCustomerAuthorizedView.id })
                        .from(activeCustomerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeCustomerAuthorizedView.authorizedCustomerId,
                              customerId,
                            ),
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
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
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeManagerAuthorizedView.id })
                        .from(activeManagerAuthorizedView)
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedView.authorizedManagerId,
                              managerId,
                            ),
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<SharedAccountWorkflowsSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveRow["tenantId"],
            excludeIds: Array<SharedAccountWorkflowsSchema.ActiveRow["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
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
            customerId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["tenantId"],
            excludeIds: Array<
              SharedAccountWorkflowsSchema.ActiveCustomerAuthorizedRow["id"]
            >,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                                metadataTable.entityId,
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
                                activeCustomerAuthorizedView.authorizedCustomerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedView.tenantId,
                                tenantId,
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
                          "authorizedCustomerId",
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
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["tenantId"],
            excludeIds: Array<
              SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["id"]
            >,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                                metadataTable.entityId,
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
                                activeManagerAuthorizedView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedView.tenantId,
                                tenantId,
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
                          "authorizedManagerId",
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

        const findActiveManagerAuthorized = Effect.fn(
          "SharedAccountWorkflows.Repository.findActiveManagerAuthorized",
        )(
          (
            managerId: SharedAccountWorkflowsSchema.ActiveManagerAuthorizedRow["authorizedManagerId"],
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
                      eq(
                        activeManagerAuthorizedView.authorizedManagerId,
                        managerId,
                      ),
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
          findActiveManagerAuthorized,
        } as const;
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

        const isManagerAuthorized = DataAccessContract.makePolicy(
          SharedAccountWorkflowsContract.isManagerAuthorized,
          {
            make: Effect.fn(
              "SharedAccountWorkflows.Policies.isManagerAuthorized.make",
            )(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveManagerAuthorized(
                    principal.userId,
                    id,
                    principal.tenantId,
                  )
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

        return { isManagerAuthorized } as const;
      }),
    },
  ) {}
}

export namespace WorkflowStatuses {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/workflows/StatusesRepository",
    {
      dependencies: [Database.TransactionManager.Default],
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

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(table)
                          .where(eq(table.tenantId, tenantId)),
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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
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
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
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
                              "authorizedCustomerId",
                            ),
                          )
                          .from(activeCustomerAuthorizedSharedAccountView)
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedSharedAccountView.authorizedCustomerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedSharedAccountView.tenantId,
                                tenantId,
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
                          "authorizedCustomerId"
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
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
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
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagerAuthorizedSharedAccountView)
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedSharedAccountView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedSharedAccountView.tenantId,
                                tenantId,
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
                          "authorizedManagerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findActivePublishedRoomCreates = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActivePublishedRoomRow["tenantId"],
          ) =>
            metadataQb
              .creates(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedRoomView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activePublishedRoomView)
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getTableName(table)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            table,
                            and(
                              eq(metadataTable.entityId, table.id),
                              not(
                                eq(metadataTable.entityVersion, table.version),
                              ),
                              eq(metadataTable.tenantId, table.tenantId),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
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
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activeView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeView.version,
                                ),
                              ),
                              eq(metadataTable.tenantId, activeView.tenantId),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
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
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["authorizedCustomerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeCustomerAuthorizedSharedAccountView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeCustomerAuthorizedSharedAccountView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeCustomerAuthorizedSharedAccountView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerAuthorizedSharedAccountView.authorizedCustomerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedSharedAccountView.tenantId,
                                tenantId,
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
                          "authorizedCustomerId",
                        ),
                      )
                      .from(cte) as Promise<
                      Array<
                        Omit<
                          WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow,
                          "authorizedCustomerId"
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
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
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
                                metadataTable.entityId,
                                activeManagerAuthorizedSharedAccountView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagerAuthorizedSharedAccountView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagerAuthorizedSharedAccountView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedSharedAccountView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedSharedAccountView.tenantId,
                                tenantId,
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
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte) as Promise<
                      Array<
                        Omit<
                          WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow,
                          "authorizedManagerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findActivePublishedRoomUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActivePublishedRoomRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePublishedRoomView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activePublishedRoomView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePublishedRoomView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePublishedRoomView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
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
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: table.id })
                        .from(table)
                        .where(eq(table.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveCustomerAuthorizedSharedAccountDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedSharedAccountDeletes",
        )(
          (
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
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
                              activeCustomerAuthorizedSharedAccountView.authorizedCustomerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerAuthorizedSharedAccountView.tenantId,
                              tenantId,
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
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
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
                              activeManagerAuthorizedSharedAccountView.authorizedManagerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedSharedAccountView.tenantId,
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findPublishedRoomDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findPublishedRoomDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActivePublishedRoomRow["tenantId"],
          ) =>
            metadataQb
              .deletes(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) =>
                    qb.except(
                      tx
                        .select({ id: activePublishedRoomView.id })
                        .from(activePublishedRoomView)
                        .where(eq(activePublishedRoomView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
            excludeIds: Array<WorkflowStatusesSchema.Row["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                              eq(metadataTable.entityId, table.id),
                              notInArray(table.id, excludeIds),
                            ),
                          )
                          .where(eq(table.tenantId, tenantId)),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveRow["tenantId"],
            excludeIds: Array<WorkflowStatusesSchema.ActiveRow["id"]>,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(eq(activeView.tenantId, tenantId)),
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
            customerId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["authorizedCustomerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["tenantId"],
            excludeIds: Array<
              WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow["id"]
            >,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                                metadataTable.entityId,
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
                                activeCustomerAuthorizedSharedAccountView.authorizedCustomerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerAuthorizedSharedAccountView.tenantId,
                                tenantId,
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
                          "authorizedCustomerId",
                        ),
                      )
                      .from(cte) as Promise<
                      Array<
                        Omit<
                          WorkflowStatusesSchema.ActiveCustomerAuthorizedSharedAccountRow,
                          "authorizedCustomerId"
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
            managerId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
            excludeIds: Array<
              WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow["id"]
            >,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                                metadataTable.entityId,
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
                                activeManagerAuthorizedSharedAccountView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedSharedAccountView.tenantId,
                                tenantId,
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
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte) as Promise<
                      Array<
                        Omit<
                          WorkflowStatusesSchema.ActiveManagerAuthorizedSharedAccountRow,
                          "authorizedManagerId"
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: WorkflowStatusesSchema.ActivePublishedRoomRow["tenantId"],
            excludeIds: Array<
              WorkflowStatusesSchema.ActivePublishedRoomRow["id"]
            >,
          ) =>
            metadataQb
              .fastForward(
                getTableName(table),
                clientViewVersion,
                clientGroupId,
                tenantId,
              )
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
                                metadataTable.entityId,
                                activePublishedRoomView.id,
                              ),
                              notInArray(
                                activePublishedRoomView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            eq(activePublishedRoomView.tenantId, tenantId),
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
          findPublishedRoomDeletes,
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

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/workflows/StatusesPolicies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const sharedAccountWorkflowRepository =
          yield* SharedAccountWorkflows.Repository;
        const ordersRepository = yield* Orders.Repository;

        const isEditable = DataAccessContract.makePolicy(
          WorkflowStatusesContract.isEditable,
          {
            make: Effect.fn("WorkflowStatuses.Policies.isEditable.make")(
              ({ id }) =>
                AccessControl.policy((principal) =>
                  repository.findById(id, principal.tenantId).pipe(
                    Effect.flatMap((workflowStatus) =>
                      Match.value(workflowStatus).pipe(
                        Match.when({ roomWorkflowId: Match.null }, (status) =>
                          sharedAccountWorkflowRepository
                            .findActiveManagerAuthorized(
                              principal.userId,
                              status.sharedAccountWorkflowId,
                              principal.tenantId,
                            )
                            .pipe(
                              Effect.andThen(true),
                              Effect.catchTag("NoSuchElementException", () =>
                                Effect.succeed(false),
                              ),
                            ),
                        ),
                        Match.orElse(() =>
                          Effect.succeed(principal.acl.has("rooms:update")),
                        ),
                      ),
                    ),
                  ),
                ),
            ),
          },
        );

        const isDeletable = DataAccessContract.makePolicy(
          WorkflowStatusesContract.isDeletable,
          {
            make: Effect.fn("WorkflowStatuses.Policies.isDeletable.make")(
              ({ id }) =>
                AccessControl.every(
                  AccessControl.policy((principal) =>
                    ordersRepository
                      .findByWorkflowStatusId(id, principal.tenantId)
                      .pipe(Effect.map(Array.isEmptyArray)),
                  ),
                  isEditable.make({ id }),
                ),
            ),
          },
        );

        return { isEditable, isDeletable } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/workflows/StatusesMutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        SharedAccountWorkflows.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const sharedAccountWorkflowPolicies =
          yield* SharedAccountWorkflows.Policies;
        const policies = yield* Policies;

        const append = DataAccessContract.makeMutation(
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
                    Effect.map(({ version: _, ...dto }) => dto),
                  ),
            ),
          },
        );

        const edit = DataAccessContract.makeMutation(
          WorkflowStatusesContract.edit,
          {
            makePolicy: Effect.fn("WorkflowStatuses.Mutations.edit.makePolicy")(
              ({ id }) =>
                AccessControl.some(
                  AccessControl.permission("workflow_statuses:update"),
                  policies.isEditable.make({ id }),
                ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutations.edit.mutator")(
              ({ id, ...workflowStatus }, session) =>
                repository
                  .updateById(id, workflowStatus, session.tenantId)
                  .pipe(Effect.map(({ version: _, ...dto }) => dto)),
            ),
          },
        );

        const reorder = DataAccessContract.makeMutation(
          WorkflowStatusesContract.reorder,
          {
            makePolicy: Effect.fn(
              "WorkflowStatuses.Mutations.reorder.makePolicy",
            )(({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:update"),
                policies.isEditable.make({ id }),
              ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutations.reorder.mutator")(
              ({ id, index, updatedAt }, session) =>
                Effect.gen(function* () {
                  const slice = yield* repository
                    .findSliceForUpdate(id, session.tenantId, index)
                    .pipe(
                      Effect.flatMap((slice) =>
                        Array.last(slice).pipe(
                          Effect.map((status) =>
                            status.id === id ? Array.reverse(slice) : slice,
                          ),
                        ),
                      ),
                    );

                  const delta = index - slice[0].index;
                  const shift = Ordering.reverse(Number.sign(delta));

                  if (!shift)
                    return yield* Effect.fail(
                      new Cause.IllegalArgumentException(
                        `Invalid workflow status index, delta with existing index must be non-zero.`,
                      ),
                    );

                  const actualDelta = (slice.length - 1) * -shift;
                  if (delta !== actualDelta)
                    return yield* Effect.fail(
                      new Cause.IllegalArgumentException(
                        `Invalid workflow status index, delta mismatch. Delta: ${delta}, actual delta: ${actualDelta}.`,
                      ),
                    );

                  // Temporarily negate indexes to avoid uniqueness violations during upsert
                  yield* repository.negateMany(
                    Array.map(slice, Struct.get("id")),
                    session.tenantId,
                  );

                  return yield* repository
                    .upsertMany(
                      Array.map(slice, (status, i) => ({
                        ...status,
                        index: status.index + (i === 0 ? delta : shift),
                        updatedAt,
                      })),
                    )
                    .pipe(
                      Effect.map(Array.map(({ version: _, ...dto }) => dto)),
                    );
                }),
            ),
          },
        );

        const delete_ = DataAccessContract.makeMutation(
          WorkflowStatusesContract.delete_,
          {
            makePolicy: Effect.fn(
              "WorkflowStatuses.Mutations.delete.makePolicy",
            )(({ id }) =>
              AccessControl.some(
                AccessControl.permission("workflow_statuses:delete"),
                policies.isDeletable.make({ id }),
              ),
            ),
            mutator: Effect.fn("WorkflowStatuses.Mutations.delete.mutator")(
              ({ id, deletedAt }, session) =>
                Effect.gen(function* () {
                  const slice = yield* repository.findTailSliceByIdForUpdate(
                    id,
                    session.tenantId,
                  );

                  const deleted = yield* repository
                    .deleteById(id, session.tenantId)
                    .pipe(
                      Effect.map(({ version: _, ...dto }) => ({
                        ...dto,
                        deletedAt,
                      })),
                    );

                  yield* repository.upsertMany(
                    Array.filterMap(slice, (status, i) =>
                      i === 0
                        ? Option.none()
                        : Option.some({
                            ...status,
                            index: Number.decrement(status.index),
                            updatedAt: deletedAt,
                          }),
                    ),
                  );

                  return deleted;
                }),
            ),
          },
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
