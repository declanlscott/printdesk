import {
  and,
  eq,
  getTableName,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import {
  activeBillingAccountManagerAuthorizationsView,
  activeBillingAccountsView,
} from "../billing-accounts2/sql";
import { DataAccess } from "../data-access2";
import { Database } from "../database2";
import { activeOrdersView } from "../orders2/sql";
import { Replicache } from "../replicache2";
import { replicacheClientViewMetadataTable } from "../replicache2/sql";
import { createInvoice } from "./shared";
import { activeInvoicesView, invoicesTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorization } from "../billing-accounts2/sql";
import type { Order } from "../orders2/sql";
import type { ReplicacheClientViewMetadata } from "../replicache2/sql";
import type { Invoice, InvoicesTable } from "./sql";

export namespace Invoices {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/invoices/Repository",
    {
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewMetadataQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = invoicesTable;
        const activeView = activeInvoicesView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = replicacheClientViewMetadataTable;

        const create = Effect.fn("Invoices.Repository.create")(
          (invoice: InferInsertModel<InvoicesTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(invoice).returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findCreates = Effect.fn("Invoices.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
          "Invoices.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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

        const findActiveCreatesByOrderBillingAccountManagerId = Effect.fn(
          "Invoices.Repository.findActiveCreatesByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
                        `${getViewName(activeView)}_creates_by_order_billing_account_manager`,
                      )
                      .as(
                        tx
                          .select(getViewSelectedFields(activeView))
                          .from(activeView)
                          .innerJoin(
                            activeOrdersView,
                            and(
                              eq(activeView.orderId, activeOrdersView.id),
                              eq(
                                activeOrdersView.tenantId,
                                activeOrdersView.tenantId,
                              ),
                            ),
                          )
                          .innerJoin(
                            activeBillingAccountsView,
                            and(
                              eq(
                                activeOrdersView.billingAccountId,
                                activeBillingAccountsView.id,
                              ),
                              eq(
                                activeOrdersView.tenantId,
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

        const findActiveCreatesByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findActiveCreatesByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
                        `${getViewName(activeView)}_creates_by_order_customer`,
                      )
                      .as(
                        tx
                          .select(getViewSelectedFields(activeView))
                          .from(activeView)
                          .innerJoin(
                            activeOrdersView,
                            and(
                              eq(activeView.orderId, activeOrdersView.id),
                              eq(
                                activeView.tenantId,
                                activeOrdersView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(activeOrdersView.customerId, customerId),
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

        const findUpdates = Effect.fn("Invoices.Repository.findUpdates")(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
          "Invoices.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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

        const findActiveUpdatesByOrderBillingAccountManagerId = Effect.fn(
          "Invoices.Repository.findActiveUpdatesByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeView)}_updates_by_order_billing_account_manager`,
                      )
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
                            activeOrdersView,
                            and(
                              eq(activeView.orderId, activeOrdersView.id),
                              eq(
                                activeOrdersView.tenantId,
                                activeOrdersView.tenantId,
                              ),
                            ),
                          )
                          .innerJoin(
                            activeBillingAccountsView,
                            and(
                              eq(
                                activeOrdersView.billingAccountId,
                                activeBillingAccountsView.id,
                              ),
                              eq(
                                activeOrdersView.tenantId,
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

        const findActiveUpdatesByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findActiveUpdatesByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
                            activeOrdersView,
                            and(
                              eq(activeView.orderId, activeOrdersView.id),
                              eq(
                                activeView.tenantId,
                                activeOrdersView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(activeOrdersView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Invoices.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
          "Invoices.Repository.findActiveDeletes",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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

        const findActiveDeletesByOrderBillingAccountManagerId = Effect.fn(
          "Invoices.Repository.findActiveDeletesByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
                          activeOrdersView,
                          and(
                            eq(activeView.orderId, activeOrdersView.id),
                            eq(
                              activeOrdersView.tenantId,
                              activeOrdersView.tenantId,
                            ),
                          ),
                        )
                        .innerJoin(
                          activeBillingAccountsView,
                          and(
                            eq(
                              activeOrdersView.billingAccountId,
                              activeBillingAccountsView.id,
                            ),
                            eq(
                              activeOrdersView.tenantId,
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

        const findDeletesByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findDeletesByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
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
                        .innerJoin(
                          activeOrdersView,
                          and(
                            eq(activeView.orderId, activeOrdersView.id),
                            eq(activeView.tenantId, activeOrdersView.tenantId),
                          ),
                        )
                        .where(
                          and(
                            eq(activeOrdersView.customerId, customerId),
                            eq(activeView.tenantId, tenantId),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findFastForward = Effect.fn(
          "Invoices.Repository.findFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
            excludeIds: Array<Invoice["id"]>,
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
          "Invoices.Repository.findActiveFastForward",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
            excludeIds: Array<Invoice["id"]>,
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

        const findActiveFastForwardByOrderBillingAccountManagerId = Effect.fn(
          "Invoices.Repository.findActiveFastForwardByOrderBillingAccountManagerId",
        )(
          (
            managerId: BillingAccountManagerAuthorization["managerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
            excludeIds: Array<Invoice["id"]>,
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
                          .innerJoin(
                            activeOrdersView,
                            and(
                              eq(activeView.orderId, activeOrdersView.id),
                              eq(
                                activeOrdersView.tenantId,
                                activeOrdersView.tenantId,
                              ),
                            ),
                          )
                          .innerJoin(
                            activeBillingAccountsView,
                            and(
                              eq(
                                activeOrdersView.billingAccountId,
                                activeBillingAccountsView.id,
                              ),
                              eq(
                                activeOrdersView.tenantId,
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

        const findActiveFastForwardByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findActiveFastForwardByOrderCustomerId",
        )(
          (
            customerId: Order["customerId"],
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: Invoice["tenantId"],
            excludeIds: Array<Invoice["id"]>,
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
                          .innerJoin(
                            activeOrdersView,
                            and(
                              eq(activeView.orderId, activeOrdersView.id),
                              eq(
                                activeView.tenantId,
                                activeOrdersView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(activeOrdersView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx.select(cte[getViewName(activeView)]).from(cte);
                  }),
                ),
              ),
        );

        return {
          create,
          findCreates,
          findActiveCreates,
          findActiveCreatesByOrderBillingAccountManagerId,
          findActiveCreatesByOrderCustomerId,
          findUpdates,
          findActiveUpdates,
          findActiveUpdatesByOrderBillingAccountManagerId,
          findActiveUpdatesByOrderCustomerId,
          findDeletes,
          findActiveDeletes,
          findActiveDeletesByOrderBillingAccountManagerId,
          findDeletesByOrderCustomerId,
          findFastForward,
          findActiveFastForward,
          findActiveFastForwardByOrderBillingAccountManagerId,
          findActiveFastForwardByOrderCustomerId,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/invoices/Mutations",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const create = yield* DataAccess.makeMutation(
          createInvoice,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("invoices:create"),
            mutator: (invoice, { tenantId }) =>
              repository.create({ ...invoice, tenantId }),
          }),
        );

        return { create } as const;
      }),
    },
  ) {}
}
