import {
  and,
  eq,
  getTableColumns,
  getTableName,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
  or,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { Events } from "../events2";
import { MutationsContract } from "../mutations/contract";
import { Permissions } from "../permissions2";
import { PoliciesContract } from "../policies/contract";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { SharedAccounts } from "../shared-accounts2";
import { Users } from "../users2";
import { WorkflowStatusesSchema } from "../workflows2/schemas";
import { OrdersContract } from "./contract";
import { OrdersSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { ColumnsContract } from "../columns2/contract";

export namespace Orders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/orders/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = OrdersSchema.table.definition;
        const activeView = OrdersSchema.activeView;
        const activeCustomerPlacedView = OrdersSchema.activeCustomerPlacedView;
        const activeManagerAuthorizedSharedAccountView =
          OrdersSchema.activeManagerAuthorizedSharedAccountView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

        const create = Effect.fn("Orders.Repository.create")(
          (order: InferInsertModel<OrdersSchema.Table>) =>
            db
              .useTransaction(
                (tx) =>
                  tx.insert(table).values(order).returning() as Promise<
                    Array<OrdersSchema.Row>
                  >,
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findCreates = Effect.fn("Orders.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.Row["tenantId"],
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
                      ) as Promise<Array<OrdersSchema.Row>>;
                  }),
                ),
              ),
        );

        const findActiveCreates = Effect.fn(
          "Orders.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveRow["tenantId"],
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
                      ) as Promise<Array<OrdersSchema.ActiveRow>>;
                  }),
                ),
              ),
        );

        const findActiveCustomerPlacedCreates = Effect.fn(
          "Orders.Repository.findActiveCustomerPlacedCreates",
        )(
          (
            customerId: OrdersSchema.ActiveRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveRow["tenantId"],
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
                        `${OrdersContract.activeCustomerPlacedViewName}_creates`,
                      )
                      .as(
                        tx
                          .select()
                          .from(activeCustomerPlacedView)
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedView.customerId,
                                customerId,
                              ),
                              eq(activeCustomerPlacedView.tenantId, tenantId),
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
                      ) as Promise<Array<OrdersSchema.ActiveCustomerPlacedRow>>;
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountCreates = Effect.fn(
          "Orders.Repository.findActiveManagerAuthorizedSharedAccountCreates",
        )(
          (
            managerId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
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
                                activeManagerAuthorizedSharedAccountView.managerId,
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
                          OrdersSchema.ActiveManagerAuthorizedSharedAccountRow,
                          "authorizedManagerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findUpdates = Effect.fn("Orders.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.Row["tenantId"],
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
                      .from(cte) as Promise<Array<OrdersSchema.Row>>;
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Orders.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveRow["tenantId"],
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
                      .from(cte) as Promise<Array<OrdersSchema.ActiveRow>>;
                  }),
                ),
              ),
        );

        const findActiveCustomerPlacedUpdates = Effect.fn(
          "Orders.Repository.findActiveCustomerPlacedUpdates",
        )(
          (
            customerId: OrdersSchema.ActiveRow["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${OrdersContract.activeCustomerPlacedViewName}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerPlacedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeCustomerPlacedView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeCustomerPlacedView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeCustomerPlacedView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedView.customerId,
                                customerId,
                              ),
                              eq(activeCustomerPlacedView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeCustomerPlacedView)])
                      .from(cte) as Promise<
                      Array<OrdersSchema.ActiveCustomerPlacedRow>
                    >;
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountUpdates = Effect.fn(
          "Orders.Repository.findActiveManagerAuthorizedSharedAccountUpdates",
        )(
          (
            managerId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
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
                                activeManagerAuthorizedSharedAccountView.managerId,
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
                          OrdersSchema.ActiveManagerAuthorizedSharedAccountRow,
                          "authorizedManagerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Orders.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.Row["tenantId"],
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
          "Orders.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerPlacedDeletes = Effect.fn(
          "Orders.Repository.findActiveCustomerPlacedDeletes",
        )(
          (
            customerId: OrdersSchema.ActiveCustomerPlacedRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveCustomerPlacedRow["tenantId"],
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
                        .select({ id: activeCustomerPlacedView.id })
                        .from(activeCustomerPlacedView)
                        .where(
                          and(
                            eq(activeCustomerPlacedView.customerId, customerId),
                            eq(activeCustomerPlacedView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountDeletes = Effect.fn(
          "Orders.Repository.findActiveManagerAuthorizedSharedAccountDeletes",
        )(
          (
            managerId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
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
                        .selectDistinctOn(
                          [
                            activeManagerAuthorizedSharedAccountView.id,
                            activeManagerAuthorizedSharedAccountView.tenantId,
                          ],
                          { id: activeManagerAuthorizedSharedAccountView.id },
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
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn("Orders.Repository.findFastForward")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.Row["tenantId"],
            excludeIds: Array<OrdersSchema.Row["id"]>,
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
                      .from(cte) as Promise<Array<OrdersSchema.Row>>;
                  }),
                ),
              ),
        );

        const findActiveFastForward = Effect.fn(
          "Orders.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveRow["tenantId"],
            excludeIds: Array<OrdersSchema.ActiveRow["id"]>,
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
                      .from(cte) as Promise<Array<OrdersSchema.ActiveRow>>;
                  }),
                ),
              ),
        );

        const findActiveCustomerPlacedFastForward = Effect.fn(
          "Orders.Repository.findActiveCustomerPlacedFastForward",
        )(
          (
            customerId: OrdersSchema.ActiveCustomerPlacedRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveCustomerPlacedRow["tenantId"],
            excludeIds: Array<OrdersSchema.ActiveCustomerPlacedRow["id"]>,
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
                        `${OrdersContract.activeCustomerPlacedViewName}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerPlacedView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeCustomerPlacedView.id,
                              ),
                              notInArray(
                                activeCustomerPlacedView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedView.customerId,
                                customerId,
                              ),
                              eq(activeCustomerPlacedView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(cte[getViewName(activeCustomerPlacedView)])
                      .from(cte) as Promise<
                      Array<OrdersSchema.ActiveCustomerPlacedRow>
                    >;
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountFastForward = Effect.fn(
          "Orders.Repository.findActiveManagerAuthorizedSharedAccountFastForward",
        )(
          (
            managerId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["tenantId"],
            excludeIds: Array<
              OrdersSchema.ActiveManagerAuthorizedSharedAccountRow["id"]
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
                                activeManagerAuthorizedSharedAccountView.managerId,
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
                          OrdersSchema.ActiveManagerAuthorizedSharedAccountRow,
                          "authorizedManagerId"
                        >
                      >
                    >;
                  }),
                ),
              ),
        );

        const findById = Effect.fn("Orders.Repository.findById")(
          (
            id: OrdersSchema.Row["id"],
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .select()
                    .from(table)
                    .where(
                      and(eq(table.id, id), eq(table.tenantId, tenantId)),
                    ) as Promise<Array<OrdersSchema.Row>>,
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIdWithWorkflowStatus = Effect.fn(
          "Orders.Repository.findByIdWithWorkflowStatus",
        )(
          (
            id: OrdersSchema.Row["id"],
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .select({
                      order: getTableColumns(table),
                      workflowStatus: getTableColumns(
                        WorkflowStatusesSchema.table.definition,
                      ),
                    })
                    .from(table)
                    .innerJoin(
                      WorkflowStatusesSchema.table.definition,
                      and(
                        or(
                          eq(
                            table.roomWorkflowStatusId,
                            WorkflowStatusesSchema.table.definition.id,
                          ),
                          eq(
                            table.sharedAccountWorkflowStatusId,
                            WorkflowStatusesSchema.table.definition.id,
                          ),
                        ),
                        eq(
                          table.tenantId,
                          WorkflowStatusesSchema.table.definition.tenantId,
                        ),
                      ),
                    )
                    .where(
                      and(eq(table.id, id), eq(table.tenantId, tenantId)),
                    ) as Promise<
                    Array<{
                      order: OrdersSchema.Row;
                      workflowStatus: WorkflowStatusesSchema.Row;
                    }>
                  >,
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByWorkflowStatusId = Effect.fn(
          "Orders.Repository.findByWorkflowStatusId",
        )(
          (
            workflowStatusId: ColumnsContract.EntityId,
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db.useTransaction(
              (tx) =>
                tx
                  .select()
                  .from(table)
                  .where(
                    and(
                      or(
                        eq(table.roomWorkflowStatusId, workflowStatusId),
                        eq(
                          table.sharedAccountWorkflowStatusId,
                          workflowStatusId,
                        ),
                      ),
                      eq(table.tenantId, tenantId),
                    ),
                  ) as Promise<Array<OrdersSchema.Row>>,
            ),
        );

        const findActiveManagerIds = Effect.fn(
          "Orders.Repository.findActiveManagerIds",
        )(
          (
            id: OrdersSchema.Row["id"],
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    managerId:
                      activeManagerAuthorizedSharedAccountView.authorizedManagerId,
                  })
                  .from(activeManagerAuthorizedSharedAccountView)
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.id, id),
                      eq(
                        activeManagerAuthorizedSharedAccountView.tenantId,
                        tenantId,
                      ),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(Struct.get("managerId")))),
        );

        const updateById = Effect.fn("Orders.Repository.updateById")(
          (
            id: OrdersSchema.Row["id"],
            order: Partial<Omit<OrdersSchema.Row, "id" | "tenantId">>,
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction(
                (tx) =>
                  tx
                    .update(table)
                    .set(order)
                    .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                    .returning() as Promise<Array<OrdersSchema.Row>>,
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActiveCustomerPlacedCreates,
          findActiveManagerAuthorizedSharedAccountCreates,
          findUpdates,
          findActiveUpdates,
          findActiveCustomerPlacedUpdates,
          findActiveManagerAuthorizedSharedAccountUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveCustomerPlacedDeletes,
          findActiveManagerAuthorizedSharedAccountDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveCustomerPlacedFastForward,
          findActiveManagerAuthorizedSharedAccountFastForward,
          findById,
          findByIdWithWorkflowStatus,
          findByWorkflowStatusId,
          findActiveManagerIds,
          updateById,
        } as const;
      }),
    },
  ) {}

  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/orders/Policies",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const decode = Schema.decodeUnknown(OrdersContract.DataTransferObject);

        const isCustomer = PoliciesContract.makePolicy(
          OrdersContract.isCustomer,
          {
            make: Effect.fn("Orders.Policies.isCustomer.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("customerId")),
                    Effect.map(Equal.equals(principal.userId)),
                  ),
              ),
            ),
          },
        );

        const isManager = PoliciesContract.makePolicy(
          OrdersContract.isManager,
          {
            make: Effect.fn("Orders.Policies.isManager.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("managerId")),
                    Effect.map(Equal.equals(principal.userId)),
                  ),
              ),
            ),
          },
        );

        const isCustomerOrManager = PoliciesContract.makePolicy(
          OrdersContract.isCustomerOrManager,
          {
            make: Effect.fn("Orders.Policies.isCustomerOrManager")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(
                      (order) =>
                        Equal.equals(order.customerId, principal.userId) ||
                        Equal.equals(order.managerId, principal.userId),
                    ),
                  ),
              ),
            ),
          },
        );

        const isManagerAuthorized = PoliciesContract.makePolicy(
          OrdersContract.isManagerAuthorized,
          {
            make: Effect.fn("Orders.Policies.isManagerAuthorized")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveManagerIds(id, principal.tenantId)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
            ),
          },
        );

        const canEdit = PoliciesContract.makePolicy(OrdersContract.canEdit, {
          make: Effect.fn("Orders.Policies.canEdit.make")(({ id }) =>
            AccessControl.policy((principal) =>
              repository
                .findByIdWithWorkflowStatus(id, principal.tenantId)
                .pipe(
                  Effect.flatMap(({ order, workflowStatus }) =>
                    decode(order).pipe(
                      Effect.map((order) => ({ order, workflowStatus })),
                    ),
                  ),
                  Effect.map(({ order, workflowStatus }) =>
                    Match.value(order).pipe(
                      Match.when({ deletedAt: Match.null }, (o) =>
                        Match.value(o).pipe(
                          Match.when(
                            { sharedAccountWorkflowStatusId: Match.null },
                            () =>
                              !order.approvedAt &&
                              !(
                                workflowStatus.type === "InProgress" ||
                                workflowStatus.type === "Completed"
                              ),
                          ),
                          Match.orElse(() => true),
                        ),
                      ),
                      Match.orElse(() => false),
                    ),
                  ),
                ),
            ),
          ),
        });

        const canApprove = PoliciesContract.makePolicy(
          OrdersContract.canApprove,
          {
            make: Effect.fn("Orders.Policies.canApprove.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findByIdWithWorkflowStatus(id, principal.tenantId)
                  .pipe(
                    Effect.map(({ order }) =>
                      Match.value(order).pipe(
                        Match.when(
                          { deletedAt: Match.null },
                          (o) => o.sharedAccountWorkflowStatusId !== null,
                        ),
                        Match.orElse(() => false),
                      ),
                    ),
                  ),
              ),
            ),
          },
        );

        const canTransition = PoliciesContract.makePolicy(
          OrdersContract.canTransition,
          {
            make: Effect.fn("Orders.Policies.canTransition.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findByIdWithWorkflowStatus(id, principal.tenantId)
                  .pipe(
                    Effect.map(({ order, workflowStatus }) =>
                      Match.value(order).pipe(
                        Match.when(
                          { deletedAt: Match.null },
                          () => workflowStatus.type !== "Completed",
                        ),
                        Match.orElse(() => false),
                      ),
                    ),
                  ),
              ),
            ),
          },
        );

        const canDelete = PoliciesContract.makePolicy(
          OrdersContract.canDelete,
          { make: Effect.fn("Orders.Policies.canDelete.make")(canEdit.make) },
        );

        const canRestore = PoliciesContract.makePolicy(
          OrdersContract.canRestore,
          {
            make: Effect.fn("Orders.Policies.canRestore.make")(({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findById(id, principal.tenantId)
                  .pipe(
                    Effect.map(Struct.get("deletedAt")),
                    Effect.map(Predicate.isNotNull),
                  ),
              ),
            ),
          },
        );

        return {
          isCustomer,
          isManager,
          isCustomerOrManager,
          isManagerAuthorized,
          canEdit,
          canApprove,
          canTransition,
          canDelete,
          canRestore,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/orders/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Users.Policies.Default,
        SharedAccounts.Policies.Default,
        Policies.Default,
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const userPolicies = yield* Users.Policies;
        const sharedAccountPolicies = yield* SharedAccounts.Policies;
        const policies = yield* Policies;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (order: OrdersContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "orders:read" }),
              PullPermission.make({ permission: "active_orders:read" }),
              Events.makeReplicachePullPolicy(
                OrdersContract.isCustomerOrManager.make({ id: order.id }),
              ),
              Events.makeReplicachePullPolicy(
                OrdersContract.isManagerAuthorized.make({ id: order.id }),
              ),
            ),
          );
        const notifyEdit = notifyCreate;
        const notifyApprove = notifyCreate;
        const notifyTransition = notifyCreate;
        const notifyDelete = notifyCreate;
        const notifyRestore = notifyCreate;

        const create = MutationsContract.makeMutation(OrdersContract.create, {
          makePolicy: Effect.fn("Orders.Mutations.create.makePolicy")((order) =>
            AccessControl.some(
              AccessControl.permission("orders:create"),
              Match.value(order).pipe(
                Match.when({ sharedAccountId: Match.string }, (order) =>
                  AccessControl.every(
                    AccessControl.some(
                      userPolicies.isSelf.make({ id: order.customerId }),
                      sharedAccountPolicies.isManagerAuthorized.make({
                        id: order.sharedAccountId,
                      }),
                    ),
                    sharedAccountPolicies.isCustomerAuthorized.make({
                      id: order.sharedAccountId,
                      customerId: order.customerId,
                    }),
                  ),
                ),
                Match.orElse((order) =>
                  userPolicies.isSelf.make({ id: order.customerId }),
                ),
              ),
            ),
          ),
          mutator: Effect.fn("Orders.Mutations.create.mutator")(
            (order, { tenantId }) =>
              // TODO: Verify workflow status is correct
              repository.create({ ...order, tenantId }).pipe(
                Effect.map(({ version: _, ...dto }) => dto),
                Effect.tap(notifyCreate),
              ),
          ),
        });

        const edit = MutationsContract.makeMutation(OrdersContract.edit, {
          makePolicy: Effect.fn("Orders.Mutations.edit.makePolicy")(({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                AccessControl.some(
                  policies.isCustomerOrManager.make({ id }),
                  policies.isManagerAuthorized.make({ id }),
                ),
              ),
              policies.canEdit.make({ id }),
            ),
          ),
          mutator: Effect.fn("Orders.Mutations.edit.mutator")(
            (order, session) =>
              repository.updateById(order.id, order, session.tenantId).pipe(
                Effect.map(({ version: _, ...dto }) => dto),
                Effect.tap(notifyEdit),
              ),
          ),
        });

        const approve = MutationsContract.makeMutation(OrdersContract.approve, {
          makePolicy: Effect.fn("Orders.Mutations.approve.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:update"),
                  policies.isManagerAuthorized.make({ id }),
                ),
                policies.canApprove.make({ id }),
              ),
          ),
          mutator: Effect.fn("Orders.Mutations.approve.makePolicy")(
            ({ id, ...order }, session) =>
              repository
                .updateById(
                  id,
                  {
                    ...order,
                    sharedAccountWorkflowStatusId: null,
                    managerId: session.userId,
                  },
                  session.tenantId,
                )
                .pipe(
                  Effect.map(({ version: _, ...dto }) => dto),
                  Effect.tap(notifyApprove),
                ),
          ),
        });

        const transitionRoomWorkflowStatus = MutationsContract.makeMutation(
          OrdersContract.transitionRoomWorkflowStatus,
          {
            makePolicy: Effect.fn(
              "Orders.Mutations.transitionRoomWorkflowStatus.makePolicy",
            )(({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:update"),
                policies.canTransition.make({ id }),
              ),
            ),
            mutator: Effect.fn(
              "Orders.Mutations.transitionRoomWorkflowStatus.mutator",
            )(({ id, ...order }, session) =>
              repository
                .updateById(
                  id,
                  { ...order, sharedAccountWorkflowStatusId: null },
                  session.tenantId,
                )
                .pipe(
                  Effect.map(({ version: _, ...dto }) => dto),
                  Effect.tap(notifyTransition),
                ),
            ),
          },
        );

        const transitionSharedAccountWorkflowStatus =
          MutationsContract.makeMutation(
            OrdersContract.transitionSharedAccountWorkflowStatus,
            {
              makePolicy: Effect.fn(
                "Orders.Mutations.transitionSharedAccountWorkflowStatus.makePolicy",
              )(({ id }) =>
                AccessControl.every(
                  AccessControl.some(
                    AccessControl.permission("orders:update"),
                    policies.isManagerAuthorized.make({ id }),
                  ),
                  policies.canTransition.make({ id }),
                ),
              ),
              mutator: Effect.fn(
                "Orders.Mutations.transitionSharedAccountWorkflowStatus.mutator",
              )(({ id, ...order }, session) =>
                repository
                  .updateById(
                    id,
                    { ...order, roomWorkflowStatusId: null },
                    session.tenantId,
                  )
                  .pipe(
                    Effect.map(({ version: _, ...dto }) => dto),
                    Effect.tap(notifyTransition),
                  ),
              ),
            },
          );

        const delete_ = MutationsContract.makeMutation(OrdersContract.delete_, {
          makePolicy: Effect.fn("Orders.Mutations.delete.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:delete"),
                  AccessControl.some(
                    policies.isCustomerOrManager.make({ id }),
                    policies.isManagerAuthorized.make({ id }),
                  ),
                ),
                policies.canDelete.make({ id }),
              ),
          ),
          mutator: Effect.fn("Orders.Mutations.delete.mutator")(
            ({ id, deletedAt }, session) =>
              repository.updateById(id, { deletedAt }, session.tenantId).pipe(
                Effect.map(({ version: _, ...dto }) => dto),
                Effect.tap(notifyDelete),
              ),
          ),
        });

        const restore = MutationsContract.makeMutation(OrdersContract.restore, {
          makePolicy: Effect.fn("Orders.Mutations.restore.makePolicy")(
            ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:delete"),
                policies.canRestore.make({ id }),
              ),
          ),
          mutator: Effect.fn("Orders.Mutations.restore.mutator")(
            ({ id }, session) =>
              repository
                .updateById(id, { deletedAt: null }, session.tenantId)
                .pipe(
                  Effect.map(({ version: _, ...dto }) => dto),
                  Effect.tap(notifyRestore),
                ),
          ),
        });

        return {
          create,
          edit,
          approve,
          transitionRoomWorkflowStatus,
          transitionSharedAccountWorkflowStatus,
          delete: delete_,
          restore,
        } as const;
      }),
    },
  ) {}
}
