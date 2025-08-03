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
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { BillingAccounts } from "../billing-accounts2";
import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { Database } from "../database2";
import { Replicache } from "../replicache2";
import { replicacheClientViewMetadataTable } from "../replicache2/sql";
import { workflowStatusesTable } from "../rooms2/sql";
import { Sync } from "../sync2";
import { activeUsersView } from "../users2/sql";
import {
  approveOrder,
  createOrder,
  deleteOrder,
  editOrder,
  transitionOrder,
} from "./shared";
import { activeOrdersView, ordersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorization } from "../billing-accounts2/sql";
import type { ReplicacheClientViewMetadata } from "../replicache2/sql";
import type { Order, OrdersTable } from "./sql";

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
        const table = ordersTable;
        const activeView = activeOrdersView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const create = Effect.fn("Orders.Repository.create")(
          (order: InferInsertModel<OrdersTable>) =>
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
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
                        `${getViewName(activeView)}_creates_by_billing_account_manager`,
                      )
                      .as(
                        tx
                          .select(getViewSelectedFields(activeView))
                          .from(activeView)
                          .innerJoin(
                            activeBillingAccountsView,
                            and(
                              eq(
                                activeView.billingAccountId,
                                activeBillingAccountsView.id,
                              ),
                              eq(
                                activeView.tenantId,
                                activeBillingAccountsView.tenantId,
                              ),
                            ),
                          )
                          .innerJoin(
                            activeBillingAccountManagerAuthorizationsView,
                            and(
                              eq(
                                activeBillingAccountsView.id,
                                activeBillingAccountManagerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeBillingAccountsView.tenantId,
                                activeBillingAccountManagerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeBillingAccountManagerAuthorizationsView.managerId,
                                managerId,
                              ),
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

        const findActiveCreatesByCustomerId = Effect.fn(
          "Orders.Repository.findActiveCreatesByCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
                      .$with(`${getViewName(activeView)}_creates_by_customer`)
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
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
                          .innerJoin(
                            activeBillingAccountsView,
                            and(
                              eq(
                                activeView.billingAccountId,
                                activeBillingAccountsView.id,
                              ),
                              eq(
                                activeView.tenantId,
                                activeBillingAccountsView.tenantId,
                              ),
                            ),
                          )
                          .innerJoin(
                            activeBillingAccountManagerAuthorizationsView,
                            and(
                              eq(
                                activeBillingAccountsView.id,
                                activeBillingAccountManagerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeBillingAccountsView.tenantId,
                                activeBillingAccountManagerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeBillingAccountManagerAuthorizationsView.managerId,
                                managerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByCustomerId = Effect.fn(
          "Orders.Repository.findActiveUpdatesByCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
                        .innerJoin(
                          activeBillingAccountsView,
                          and(
                            eq(
                              activeView.billingAccountId,
                              activeBillingAccountsView.id,
                            ),
                            eq(
                              activeView.tenantId,
                              activeBillingAccountsView.tenantId,
                            ),
                          ),
                        )
                        .innerJoin(
                          activeBillingAccountManagerAuthorizationsView,
                          and(
                            eq(
                              activeBillingAccountsView.id,
                              activeBillingAccountManagerAuthorizationsView.billingAccountId,
                            ),
                            eq(
                              activeBillingAccountsView.tenantId,
                              activeBillingAccountManagerAuthorizationsView.tenantId,
                            ),
                          ),
                        )
                        .where(
                          and(
                            eq(
                              activeBillingAccountManagerAuthorizationsView.managerId,
                              managerId,
                            ),
                            eq(activeView.tenantId, tenantId),
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
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
            excludeIds: Array<Order["id"]>,
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
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
            excludeIds: Array<Order["id"]>,
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
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
            excludeIds: Array<Order["id"]>,
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
                        `${getViewName(activeView)}_fast_forward_by_billing_account_manager`,
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
                          .innerJoin(
                            activeBillingAccountsView,
                            and(
                              eq(
                                activeView.billingAccountId,
                                activeBillingAccountsView.id,
                              ),
                              eq(
                                activeView.tenantId,
                                activeBillingAccountsView.tenantId,
                              ),
                            ),
                          )
                          .innerJoin(
                            activeBillingAccountManagerAuthorizationsView,
                            and(
                              eq(
                                activeBillingAccountsView.id,
                                activeBillingAccountManagerAuthorizationsView.billingAccountId,
                              ),
                              eq(
                                activeBillingAccountsView.tenantId,
                                activeBillingAccountManagerAuthorizationsView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeBillingAccountManagerAuthorizationsView.managerId,
                                managerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByCustomerId = Effect.fn(
          "Orders.Repository.findActiveFastForwardByCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Order["tenantId"],
            excludeIds: Array<Order["id"]>,
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
          (id: Order["id"], tenantId: Order["tenantId"]) =>
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
        )((id: Order["id"], tenantId: Order["tenantId"]) =>
          db
            .useTransaction((tx) =>
              tx
                .select({ id: activeUsersView.id })
                .from(activeView)
                .innerJoin(
                  activeBillingAccountManagerAuthorizationsView,
                  and(
                    eq(
                      activeView.billingAccountId,
                      activeBillingAccountManagerAuthorizationsView.billingAccountId,
                    ),
                    eq(
                      activeView.tenantId,
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                    ),
                  ),
                )
                .innerJoin(
                  activeUsersView,
                  and(
                    eq(
                      activeBillingAccountManagerAuthorizationsView.managerId,
                      activeUsersView.id,
                    ),
                    eq(
                      activeBillingAccountManagerAuthorizationsView.tenantId,
                      activeUsersView.tenantId,
                    ),
                  ),
                )
                .where(
                  and(eq(activeView.id, id), eq(activeView.tenantId, tenantId)),
                ),
            )
            .pipe(Effect.map(Array.map(({ id }) => id))),
        );

        const findStatus = Effect.fn("Orders.Repository.findStatus")(
          (id: Order["id"], tenantId: Order["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({
                    status: getTableColumns(workflowStatusesTable),
                  })
                  .from(table)
                  .leftJoin(
                    workflowStatusesTable,
                    and(
                      eq(table.workflowStatus, workflowStatusesTable.id),
                      eq(table.tenantId, workflowStatusesTable.tenantId),
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
            id: Order["id"],
            order: Partial<Omit<Order, "id" | "tenantId">>,
            tenantId: Order["tenantId"],
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
            id: Order["id"],
            deletedAt: NonNullable<Order["deletedAt"]>,
            tenantId: Order["tenantId"],
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

        const deleteByProductId = Effect.fn(
          "Orders.Repository.deleteByProductId",
        )(
          (
            productId: Order["productId"],
            deletedAt: NonNullable<Order["deletedAt"]>,
            tenantId: Order["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set({ deletedAt })
                  .where(
                    and(
                      eq(table.productId, productId),
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
          deleteById,
          deleteByProductId,
        } as const;
      }),
    },
  ) {}

  export class Policy extends Effect.Service<Policy>()(
    "@printdesk/core/orders/Policy",
    {
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const isCustomer = Effect.fn("Orders.Policy.isCustomer")(
          (id: Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map((order) => order.customerId === principal.userId),
                ),
            ),
        );

        const isManager = Effect.fn("Orders.Policy.isManager")(
          (id: Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map((order) => order.managerId === principal.userId),
                ),
            ),
        );

        const isCustomerOrManager = Effect.fn(
          "Orders.Policy.isCustomerOrManager",
        )((id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findById(id, principal.tenantId)
              .pipe(
                Effect.map(
                  (order) =>
                    order.customerId === principal.userId ||
                    order.managerId === principal.userId,
                ),
              ),
          ),
        );

        const hasActiveManagerAuthorization = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findActiveManagerIds(id, principal.tenantId)
              .pipe(
                Effect.map(
                  Array.some((managerId) => managerId === principal.userId),
                ),
              ),
          );

        const canEdit = (id: Order["id"]) =>
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
          );

        const canApprove = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findStatus(id, principal.tenantId)
              .pipe(Effect.map((status) => status?.type === "Review")),
          );

        const canTransition = (id: Order["id"]) =>
          AccessControl.policy((principal) =>
            repository
              .findStatus(id, principal.tenantId)
              .pipe(Effect.map((status) => status?.type !== "Completed")),
          );

        const canDelete = canEdit;

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

  export class SyncMutations extends Effect.Service<SyncMutations>()(
    "@printdesk/core/orders/SyncMutations",
    {
      dependencies: [Policy.Default, BillingAccounts.Policy.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;
        const policy = yield* Policy;
        const billingAccountsPolicy = yield* BillingAccounts.Policy;

        const create = Sync.Mutation(
          createOrder,
          ({ billingAccountId }) =>
            AccessControl.some(
              AccessControl.permission("orders:create"),
              billingAccountsPolicy.hasActiveAuthorization(billingAccountId),
            ),
          (order, { tenantId }) =>
            // TODO: Verify workflow status is correct
            repository.create({ ...order, tenantId }),
        );

        const edit = Sync.Mutation(
          editOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                policy.isCustomer(id),
              ),
              policy.canEdit(id),
            ),
          ({ id, ...order }, session) =>
            repository.updateById(id, order, session.tenantId),
        );

        const approve = Sync.Mutation(
          approveOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.some(
                AccessControl.permission("orders:update"),
                policy.hasActiveManagerAuthorization(id),
              ),
              policy.canApprove(id),
            ),
          ({ id, ...order }, session) =>
            // TODO: Transition to first "New" status
            repository.updateById(id, order, session.tenantId),
        );

        const transition = Sync.Mutation(
          transitionOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.permission("orders:update"),
              policy.canTransition(id),
            ),
          ({ id, ...order }, session) =>
            repository.updateById(id, order, session.tenantId),
        );

        const delete_ = Sync.Mutation(
          deleteOrder,
          ({ id }) =>
            AccessControl.every(
              AccessControl.permission("orders:delete"),
              policy.canDelete(id),
            ),
          ({ id, deletedAt }, session) =>
            repository.deleteById(id, deletedAt, session.tenantId),
        );

        return { create, edit, approve, transition, delete: delete_ } as const;
      }),
    },
  ) {}
}
