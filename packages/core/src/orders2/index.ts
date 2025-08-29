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
} from "drizzle-orm";
import { Array, Effect, Equal, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { BillingAccounts } from "../billing-accounts2";
import { BillingAccountManagerAuthorizationsSchema } from "../billing-accounts2/schemas";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { WorkflowStatusesSchema } from "../rooms2/schemas";
import { Users } from "../users2";
import { UsersSchema } from "../users2/schema";
import { OrdersContract } from "./contract";
import { OrdersSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";

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
        const table = OrdersSchema.table;
        const activeView = OrdersSchema.activeView;
        const activeManagedBillingAccountView =
          OrdersSchema.activeManagedBillingAccountView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const create = Effect.fn("Orders.Repository.create")(
          (order: InferInsertModel<OrdersSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(order).returning(),
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
          "Orders.Repository.findActiveCreates",
        )(
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

        const findActiveCreatesByBillingAccountManagerId = Effect.fn(
          "Orders.Repository.findActiveCreatesByBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
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
                      .$with(
                        `${getViewName(activeManagedBillingAccountView)}_creates`,
                      )
                      .as(
                        tx
                          .selectDistinctOn(
                            [
                              activeManagedBillingAccountView.id,
                              activeManagedBillingAccountView.tenantId,
                            ],
                            Struct.omit(
                              getViewSelectedFields(
                                activeManagedBillingAccountView,
                              ),
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagedBillingAccountView)
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountView.managerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountView.tenantId,
                                tenantId,
                              ),
                            ),
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "Orders.Repository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
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
                      .$with(`${OrdersContract.activePlacedViewName}_creates`)
                      .as(
                        tx
                          .select()
                          .from(activeView)
                          .where(
                            and(
                              eq(activeView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
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

                    return tx.select(cte[getTableName(table)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Orders.Repository.findActiveUpdates",
        )(
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

        const findActiveUpdatesByBillingAccountManagerId = Effect.fn(
          "Orders.Repository.findActiveUpdatesByBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagedBillingAccountView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedBillingAccountView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedBillingAccountView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagedBillingAccountView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagedBillingAccountView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountView.managerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeManagedBillingAccountView.id,
                          activeManagedBillingAccountView.tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeManagedBillingAccountView)],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByCustomerId = Effect.fn(
          "Orders.Repository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${OrdersContract.activePlacedViewName}_updates`)
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
                          .where(
                            and(
                              eq(activeView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
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
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(eq(activeView.tenantId, tenantId)),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletesByBillingAccountManagerId = Effect.fn(
          "Orders.Repository.findActiveDeletesByBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
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
                        .selectDistinctOn(
                          [
                            activeManagedBillingAccountView.id,
                            activeManagedBillingAccountView.tenantId,
                          ],
                          { id: activeManagedBillingAccountView.id },
                        )
                        .from(activeManagedBillingAccountView)
                        .where(
                          and(
                            eq(
                              activeManagedBillingAccountView.managerId,
                              managerId,
                            ),
                            eq(
                              activeManagedBillingAccountView.tenantId,
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveDeletesByCustomerId = Effect.fn(
          "Orders.Repository.findActiveDeletesByCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
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
                        .select({ id: activeView.id })
                        .from(activeView)
                        .where(
                          and(
                            eq(activeView.customerId, customerId),
                            eq(activeView.tenantId, tenantId),
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

                    return tx.select(cte[getTableName(table)]).from(cte);
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

        const findActiveFastForwardByBillingAccountManagerId = Effect.fn(
          "Orders.Repository.findActiveFastForwardByBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
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
                      .$with(
                        `${getViewName(activeManagedBillingAccountView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedBillingAccountView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedBillingAccountView.id,
                              ),
                              notInArray(
                                activeManagedBillingAccountView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountView.managerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .selectDistinctOn(
                        [
                          activeManagedBillingAccountView.id,
                          activeManagedBillingAccountView.tenantId,
                        ],
                        Struct.omit(
                          cte[getViewName(activeManagedBillingAccountView)],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomerId = Effect.fn(
          "Orders.Repository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
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
                      .$with(
                        `${OrdersContract.activePlacedViewName}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeView,
                            and(
                              eq(metadataTable.entityId, activeView.id),
                              notInArray(activeView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activeView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
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
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
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
                  .select({ id: UsersSchema.activeView.id })
                  .from(activeView)
                  .innerJoin(
                    BillingAccountManagerAuthorizationsSchema.activeView,
                    and(
                      eq(
                        activeView.billingAccountId,
                        BillingAccountManagerAuthorizationsSchema.activeView
                          .billingAccountId,
                      ),
                      eq(
                        activeView.tenantId,
                        BillingAccountManagerAuthorizationsSchema.activeView
                          .tenantId,
                      ),
                    ),
                  )
                  .innerJoin(
                    UsersSchema.activeView,
                    and(
                      eq(
                        BillingAccountManagerAuthorizationsSchema.activeView
                          .managerId,
                        UsersSchema.activeView.id,
                      ),
                      eq(
                        BillingAccountManagerAuthorizationsSchema.activeView
                          .tenantId,
                        UsersSchema.activeView.tenantId,
                      ),
                    ),
                  )
                  .where(
                    and(
                      eq(activeView.id, id),
                      eq(activeView.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findStatus = Effect.fn("Orders.Repository.findStatus")(
          (
            id: OrdersSchema.Row["id"],
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    status: getTableColumns(WorkflowStatusesSchema.table),
                  })
                  .from(table)
                  .leftJoin(
                    WorkflowStatusesSchema.table,
                    and(
                      eq(table.workflowStatus, WorkflowStatusesSchema.table.id),
                      eq(table.tenantId, WorkflowStatusesSchema.table.tenantId),
                    ),
                  )
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.map(({ status }) => status),
              ),
        );

        const updateById = Effect.fn("Orders.Repository.updateById")(
          (
            id: OrdersSchema.Row["id"],
            order: Partial<Omit<OrdersSchema.Row, "id" | "tenantId">>,
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(order)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("Orders.Repository.deleteById")(
          (
            id: OrdersSchema.Row["id"],
            deletedAt: NonNullable<OrdersSchema.Row["deletedAt"]>,
            tenantId: OrdersSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActiveCreatesByBillingAccountManagerId,
          findActiveCreatesByCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByBillingAccountManagerId,
          findActiveUpdatesByCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByBillingAccountManagerId,
          findActiveDeletesByCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByBillingAccountManagerId,
          findActiveFastForwardByCustomerId,
          findById,
          findActiveManagerIds,
          findStatus,
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

        const isCustomer = DataAccessContract.makePolicy(
          OrdersContract.isCustomer,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id, principal.tenantId).pipe(
                  Effect.map(({ customerId }) => customerId),
                  Effect.map(Equal.equals(principal.userId)),
                ),
              ),
          }),
        );

        const isManager = DataAccessContract.makePolicy(
          OrdersContract.isManager,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository.findById(id, principal.tenantId).pipe(
                  Effect.map(({ managerId }) => managerId),
                  Effect.map(Equal.equals(principal.userId)),
                ),
              ),
          }),
        );

        const isCustomerOrManager = DataAccessContract.makePolicy(
          OrdersContract.isCustomerOrManager,
          Effect.succeed({
            make: ({ id }) =>
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
          }),
        );

        const hasActiveManagerAuthorization = DataAccessContract.makePolicy(
          OrdersContract.hasActiveManagerAuthorization,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findActiveManagerIds(id, principal.tenantId)
                  .pipe(Effect.map(Array.some(Equal.equals(principal.userId)))),
              ),
          }),
        );

        const canEdit = DataAccessContract.makePolicy(
          OrdersContract.canEdit,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findStatus(id, principal.tenantId)
                  .pipe(
                    Effect.map((status) =>
                      status !== null
                        ? !(
                            status.type === "InProgress" ||
                            status.type === "Completed"
                          )
                        : false,
                    ),
                  ),
              ),
          }),
        );

        const canApprove = DataAccessContract.makePolicy(
          OrdersContract.canApprove,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findStatus(id, principal.tenantId)
                  .pipe(Effect.map((status) => status?.type === "Review")),
              ),
          }),
        );

        const canTransition = DataAccessContract.makePolicy(
          OrdersContract.canTransition,
          Effect.succeed({
            make: ({ id }) =>
              AccessControl.policy((principal) =>
                repository
                  .findStatus(id, principal.tenantId)
                  .pipe(Effect.map((status) => status?.type !== "Completed")),
              ),
          }),
        );

        const canDelete = DataAccessContract.makePolicy(
          OrdersContract.canDelete,
          canEdit,
        );

        return {
          isCustomer,
          isManager,
          isCustomerOrManager,
          hasActiveManagerAuthorization,
          canEdit,
          canApprove,
          canTransition,
          canDelete,
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
        BillingAccounts.Policies.Default,
        Policies.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isSelf = yield* Users.Policies.isSelf;

        const hasActiveCustomerAuthorization =
          yield* BillingAccounts.Policies.hasActiveCustomerAuthorization;
        const hasActiveManagerAuthorization =
          yield* BillingAccounts.Policies.hasActiveManagerAuthorization;

        const isCustomerOrManager = yield* Policies.isCustomerOrManager;
        const canEdit = yield* Policies.canEdit;
        const hasOrderActiveManagerAuthorization =
          yield* Policies.hasActiveManagerAuthorization;
        const canApprove = yield* Policies.canApprove;
        const canTransition = yield* Policies.canTransition;
        const canDelete = yield* Policies.canDelete;

        const create = DataAccessContract.makeMutation(
          OrdersContract.create,
          Effect.succeed({
            makePolicy: ({ billingAccountId, customerId }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:create"),
                  isSelf.make({ id: customerId }),
                  hasActiveManagerAuthorization.make({ id: billingAccountId }),
                ),
                hasActiveCustomerAuthorization.make({
                  id: billingAccountId,
                  customerId,
                }),
              ),
            mutator: (order, { tenantId }) =>
              // TODO: Verify workflow status is correct
              repository
                .create({ ...order, tenantId })
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          OrdersContract.edit,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:update"),
                  isCustomerOrManager.make({ id }),
                ),
                canEdit.make({ id }),
              ),
            mutator: (order, { tenantId }) =>
              repository
                .updateById(order.id, order, tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const approve = DataAccessContract.makeMutation(
          OrdersContract.approve,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.some(
                  AccessControl.permission("orders:update"),
                  hasOrderActiveManagerAuthorization.make({ id }),
                ),
                canApprove.make({ id }),
              ),
            mutator: ({ id, ...order }, session) =>
              repository
                .updateById(id, order, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const transition = DataAccessContract.makeMutation(
          OrdersContract.transition,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:update"),
                canTransition.make({ id }),
              ),
            mutator: ({ id, ...order }, session) =>
              repository
                .updateById(id, order, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          OrdersContract.delete_,
          Effect.succeed({
            makePolicy: ({ id }) =>
              AccessControl.every(
                AccessControl.permission("orders:delete"),
                canDelete.make({ id }),
              ),
            mutator: ({ id, deletedAt }, session) =>
              repository
                .updateById(id, { deletedAt }, session.tenantId)
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        return { create, edit, approve, transition, delete: delete_ } as const;
      }),
    },
  ) {}
}
