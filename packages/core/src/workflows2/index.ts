import {
  and,
  asc,
  desc,
  eq,
  getTableName,
  getViewName,
  gte,
  inArray,
  lte,
  not,
  notInArray,
  sql,
} from "drizzle-orm";
import { Array, Effect, Number, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { buildConflictSet } from "../database2/constructors";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { WorkflowStatusesContract } from "./contracts";
import {
  BillingAccountWorkflowsSchema,
  RoomWorkflowsSchema,
  WorkflowStatusesSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";

export namespace BillingAccountWorkflows {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/workflows/BillingAccountsRepository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = BillingAccountWorkflowsSchema.table;
        const activeView = BillingAccountWorkflowsSchema.activeView;
        const activeCustomerAuthorizedView =
          BillingAccountWorkflowsSchema.activeCustomerAuthorizedView;
        const activeManagerAuthorizedView =
          BillingAccountWorkflowsSchema.activeManagerAuthorizedView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const create = Effect.fn("BillingAccountWorkflows.Repository.create")(
          (
            roomWorkflow: InferInsertModel<BillingAccountWorkflowsSchema.Table>,
          ) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(roomWorkflow).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn(
          "BillingAccountWorkflows.Repository.findCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
          "BillingAccountWorkflows.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
          "BillingAccountWorkflows.Repository.findActiveCustomerAuthorizedCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
                          .select()
                          .from(activeCustomerAuthorizedView)
                          .where(
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
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
          "BillingAccountWorkflows.Repository.findActiveManagerAuthorizedCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
                          .select()
                          .from(activeManagerAuthorizedView)
                          .where(
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
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
          "BillingAccountWorkflows.Repository.findUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedUpdates = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveCustomerAuthorizedUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeCustomerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedUpdates = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveManagerAuthorizedUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeManagerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn(
          "BillingAccountWorkflows.Repository.findDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
          "BillingAccountWorkflows.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
          "BillingAccountWorkflows.Repository.findActiveCustomerAuthorizedDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
                          eq(activeCustomerAuthorizedView.tenantId, tenantId),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveManagerAuthorizedDeletes = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveManagerAuthorizedDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
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
                          eq(activeManagerAuthorizedView.tenantId, tenantId),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "BillingAccountWorkflows.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountWorkflowsSchema.Row["id"]>,
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountWorkflowsSchema.Row["id"]>,
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedFastForward = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveCustomerAuthorizedFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountWorkflowsSchema.Row["id"]>,
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
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeCustomerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedFastForward = Effect.fn(
          "BillingAccountWorkflows.Repository.findActiveManagerAuthorizedFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
            excludeIds: Array<BillingAccountWorkflowsSchema.Row["id"]>,
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
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeManagerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const updateByBillingAccountId = Effect.fn(
          "BillingAccountWorkflows.Repository.updateByRoomId",
        )(
          (
            billingAccountId: BillingAccountWorkflowsSchema.Row["billingAccountId"],
            roomWorkflow: Partial<
              Omit<
                BillingAccountWorkflowsSchema.Row,
                "id" | "roomId" | "tenantId"
              >
            >,
            tenantId: BillingAccountWorkflowsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(roomWorkflow)
                  .where(
                    and(
                      eq(table.billingAccountId, billingAccountId),
                      eq(table.tenantId, tenantId),
                    ),
                  )
                  .returning(),
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
          updateByBillingAccountId,
        } as const;
      }),
    },
  ) {}
}

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
        const table = RoomWorkflowsSchema.table;
        const activeView = RoomWorkflowsSchema.activeView;
        const activePublishedRoomView =
          RoomWorkflowsSchema.activePublishedRoomView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

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

                    return tx.select(cte[getTableName(table)]).from(cte);
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
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

                    return tx.select(cte[getTableName(table)]).from(cte);
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
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
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const updateByRoomId = Effect.fn(
          "RoomWorkflows.Repository.updateByRoomId",
        )(
          (
            roomId: RoomWorkflowsSchema.Row["roomId"],
            roomWorkflow: Partial<
              Omit<RoomWorkflowsSchema.Row, "id" | "roomId" | "tenantId">
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
          updateByRoomId,
        } as const;
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
        const table = WorkflowStatusesSchema.table;
        const activeView = WorkflowStatusesSchema.activeView;
        const activeCustomerAuthorizedView =
          WorkflowStatusesSchema.activeCustomerAuthorizedView;
        const activeManagerAuthorizedView =
          WorkflowStatusesSchema.activeManagerAuthorizedView;
        const activePublishedRoomView =
          WorkflowStatusesSchema.activePublishedRoomView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const create = Effect.fn("WorkflowStatuses.Repository.create")(
          (workflowStatus: InferInsertModel<WorkflowStatusesSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(workflowStatus).returning(),
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
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(workflowStatuses)
                .onConflictDoUpdate({
                  target: [table.id, table.tenantId],
                  set: buildConflictSet(table),
                })
                .returning(),
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
          "WorkflowStatuses.Repository.findActiveCreates",
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
                      .$with(`${getViewName(activeView)}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(eq(activeView.tenantId, tenantId)),
                      );

                    return tx
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
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedCreates",
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
                      .$with(
                        `${getViewName(activeCustomerAuthorizedView)}_creates`,
                      )
                      .as(
                        tx
                          .select()
                          .from(activeCustomerAuthorizedView)
                          .where(
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
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
          "WorkflowStatuses.Repository.findActiveManagerAuthorizedCreates",
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
                      .$with(
                        `${getViewName(activeManagerAuthorizedView)}_creates`,
                      )
                      .as(
                        tx
                          .select()
                          .from(activeManagerAuthorizedView)
                          .where(
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
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
          "WorkflowStatuses.Repository.findActivePublishedRoomCreates",
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveUpdates",
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedUpdates",
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
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeCustomerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActiveManagerAuthorizedUpdates",
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
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeManagerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActivePublishedRoomUpdates = Effect.fn(
          "WorkflowStatuses.Repository.findActivePublishedRoomUpdates",
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
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
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
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findCustomerAuthorizedDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findCustomerAuthorizedDeletes",
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
                        .select({ id: activeCustomerAuthorizedView.id })
                        .from(activeCustomerAuthorizedView)
                        .where(
                          eq(activeCustomerAuthorizedView.tenantId, tenantId),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findManagerAuthorizedDeletes = Effect.fn(
          "WorkflowStatuses.Repository.findManagerAuthorizedDeletes",
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
                        .select({ id: activeManagerAuthorizedView.id })
                        .from(activeManagerAuthorizedView)
                        .where(
                          eq(activeManagerAuthorizedView.tenantId, tenantId),
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

                    return tx.select(cte[getTableName(table)]).from(cte);
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

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveCustomerAuthorizedFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findActiveCustomerAuthorizedFastForward",
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
                            eq(activeCustomerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeCustomerAuthorizedView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedFastForward = Effect.fn(
          "WorkflowStatuses.Repository.findActiveManagerAuthorizedFastForward",
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
                            eq(activeManagerAuthorizedView.tenantId, tenantId),
                          ),
                      );

                    return tx
                      .select(cte[getViewName(activeManagerAuthorizedView)])
                      .from(cte);
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
                      .select(cte[getViewName(activePublishedRoomView)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findTailIndexByWorkflowId = Effect.fn(
          "WorkflowStatuses.Repository.findTailIndexByWorkflowId",
        )(
          (
            workflowId: WorkflowStatusesSchema.Row["workflowId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ index: table.index })
                  .from(table)
                  .where(
                    and(
                      eq(table.workflowId, workflowId),
                      eq(table.tenantId, tenantId),
                    ),
                  )
                  .orderBy(desc(table.index))
                  .limit(1),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findSliceByWorkflowId = Effect.fn(
          "WorkflowStatuses.Repository.findSliceByWorkflowId",
        )(
          (
            start: WorkflowStatusesSchema.Row["index"],
            end: WorkflowStatusesSchema.Row["index"],
            workflowId: WorkflowStatusesSchema.Row["workflowId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            Effect.succeed(Number.sign(end - start) > 0).pipe(
              Effect.flatMap((isAscending) =>
                db.useTransaction((tx) =>
                  tx
                    .select()
                    .from(table)
                    .where(
                      and(
                        eq(table.workflowId, workflowId),
                        eq(table.tenantId, tenantId),
                        isAscending
                          ? and(gte(table.index, start), lte(table.index, end))
                          : and(lte(table.index, start), gte(table.index, end)),
                      ),
                    )
                    .orderBy(
                      isAscending ? asc(table.index) : desc(table.index),
                    ),
                ),
              ),
            ),
        );

        const negateIndexes = Effect.fn(
          "WorkflowStatuses.Repository.negateIndexes",
        )(
          (
            ids: ReadonlyArray<WorkflowStatusesSchema.Row["id"]>,
            workflowId: WorkflowStatusesSchema.Row["workflowId"],
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ index: sql`-${table.index}` })
                .where(
                  and(
                    inArray(table.id, ids),
                    eq(table.workflowId, workflowId),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .returning(),
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
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(workflowStatus)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const updateByWorkflowId = Effect.fn(
          "WorkflowStatuses.Repository.updateByWorkflowId",
        )(
          (
            workflowId: WorkflowStatusesSchema.Row["workflowId"],
            workflowStatus: Partial<
              Omit<WorkflowStatusesSchema.Row, "id" | "workflowId" | "tenantId">
            >,
            tenantId: WorkflowStatusesSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(workflowStatus)
                  .where(
                    and(
                      eq(table.workflowId, workflowId),
                      eq(table.tenantId, tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          upsertMany,
          findCreates,
          findActiveCreates,
          findActiveCustomerAuthorizedCreates,
          findActiveManagerAuthorizedCreates,
          findActivePublishedRoomCreates,
          findUpdates,
          findActiveUpdates,
          findActiveCustomerAuthorizedUpdates,
          findActiveManagerAuthorizedUpdates,
          findActivePublishedRoomUpdates,
          findDeletes,
          findActiveDeletes,
          findCustomerAuthorizedDeletes,
          findManagerAuthorizedDeletes,
          findPublishedRoomDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveCustomerAuthorizedFastForward,
          findActiveManagerAuthorizedFastForward,
          findActivePublishedRoomFastForward,
          findTailIndexByWorkflowId,
          findSliceByWorkflowId,
          negateIndexes,
          updateById,
          updateByWorkflowId,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/workflows/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const append = DataAccessContract.makeMutation(
          WorkflowStatusesContract.append,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:create"),
            mutator: (workflowStatus, { tenantId }) =>
              repository
                .findTailIndexByWorkflowId(workflowStatus.workflowId, tenantId)
                .pipe(
                  Effect.catchTag("NoSuchElementException", () =>
                    Effect.succeed({ index: -1 }),
                  ),
                  Effect.map(({ index }) => ++index),
                  Effect.flatMap((index) =>
                    repository.create({ ...workflowStatus, index, tenantId }),
                  ),
                  Effect.map(Struct.omit("version")),
                ),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          WorkflowStatusesContract.edit,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:update"),
            mutator: ({ id, ...workflowStatus }, session) =>
              repository
                .updateById(id, workflowStatus, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const reorder = DataAccessContract.makeMutation(
          WorkflowStatusesContract.reorder,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:update"),
            mutator: ({ oldIndex, newIndex, updatedAt, workflowId }, session) =>
              Effect.gen(function* () {
                const delta = newIndex - oldIndex;
                const shift = -Number.sign(delta);

                const slice = yield* repository.findSliceByWorkflowId(
                  oldIndex,
                  newIndex,
                  workflowId,
                  session.tenantId,
                );

                const sliceLength = slice.length;
                const absoluteDelta = Math.abs(delta);
                if (sliceLength !== absoluteDelta)
                  return yield* Effect.fail(
                    new WorkflowStatusesContract.InvalidReorderDeltaError({
                      sliceLength,
                      absoluteDelta,
                    }),
                  );

                // Temporarily negate indexes to avoid uniqueness violations in upsert
                yield* repository.negateIndexes(
                  Array.map(slice, ({ id }) => id),
                  workflowId,
                  session.tenantId,
                );

                return yield* repository.upsertMany(
                  Array.map(slice, (option, sliceIndex) => ({
                    ...option,
                    index: option.index + (sliceIndex === 0 ? delta : shift),
                    updatedAt,
                  })),
                );
              }),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          WorkflowStatusesContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("workflow_statuses:delete"),
            mutator: ({ id, deletedAt }, session) =>
              repository
                .updateById(id, { deletedAt }, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
