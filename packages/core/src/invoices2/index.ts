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
import { Array, Effect, Struct } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Database } from "../database2";
import { Replicache } from "../replicache2";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { InvoicesContract } from "./contract";
import { InvoicesSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccountManagerAuthorizationsSchema } from "../billing-accounts2/schemas";
import type { OrdersSchema } from "../orders2/schema";

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
        const table = InvoicesSchema.table;
        const activeView = InvoicesSchema.activeView;
        const activeManagedBillingAccountOrderView =
          InvoicesSchema.activeManagedBillingAccountOrderView;
        const activePlacedOrderView = InvoicesSchema.activePlacedOrderView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable = ReplicacheClientViewMetadataSchema.table;

        const create = Effect.fn("Invoices.Repository.create")(
          (invoice: InferInsertModel<InvoicesSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(invoice).returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findCreates = Effect.fn("Invoices.Repository.findCreates")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
                        `${getViewName(activeManagedBillingAccountOrderView)}_creates`,
                      )
                      .as(
                        tx
                          .selectDistinctOn(
                            [
                              activeManagedBillingAccountOrderView.id,
                              activeManagedBillingAccountOrderView.tenantId,
                            ],
                            Struct.omit(
                              getViewSelectedFields(
                                activeManagedBillingAccountOrderView,
                              ),
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagedBillingAccountOrderView)
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountOrderView.tenantId,
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

        const findActiveCreatesByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findActiveCreatesByOrderCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
                      .$with(`${getViewName(activePlacedOrderView)}_creates`)
                      .as(
                        tx
                          .select(
                            Struct.omit(
                              getViewSelectedFields(activePlacedOrderView),
                              "customerId",
                            ),
                          )
                          .from(activePlacedOrderView)
                          .where(
                            and(
                              eq(activePlacedOrderView.customerId, customerId),
                              eq(activePlacedOrderView.tenantId, tenantId),
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagedBillingAccountOrderView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedBillingAccountOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedBillingAccountOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagedBillingAccountOrderView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagedBillingAccountOrderView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .select(
                        Struct.omit(
                          cte[
                            getViewName(activeManagedBillingAccountOrderView)
                          ],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdatesByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findActiveUpdatesByOrderCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(`${getViewName(activePlacedOrderView)}_updates`)
                      .as(
                        qb
                          .innerJoin(
                            activePlacedOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePlacedOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activePlacedOrderView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activePlacedOrderView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(activePlacedOrderView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
                      .select(
                        Struct.omit(
                          cte[getViewName(activePlacedOrderView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findDeletes = Effect.fn("Invoices.Repository.findDeletes")(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
                            activeManagedBillingAccountOrderView.id,
                            activeManagedBillingAccountOrderView.tenantId,
                          ],
                          { id: activeManagedBillingAccountOrderView.id },
                        )
                        .from(activeManagedBillingAccountOrderView)
                        .where(
                          and(
                            eq(
                              activeManagedBillingAccountOrderView.authorizedManagerId,
                              managerId,
                            ),
                            eq(
                              activeManagedBillingAccountOrderView.tenantId,
                              tenantId,
                            ),
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
            customerId: OrdersSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
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
                        .select({ id: activePlacedOrderView.id })
                        .from(activePlacedOrderView)
                        .where(
                          and(
                            eq(activePlacedOrderView.customerId, customerId),
                            eq(activePlacedOrderView.tenantId, tenantId),
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
            excludeIds: Array<InvoicesSchema.Row["id"]>,
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
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
            excludeIds: Array<InvoicesSchema.Row["id"]>,
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
            managerId: BillingAccountManagerAuthorizationsSchema.Row["managerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
            excludeIds: Array<InvoicesSchema.Row["id"]>,
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
                        `${getViewName(activeManagedBillingAccountOrderView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagedBillingAccountOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagedBillingAccountOrderView.id,
                              ),
                              notInArray(
                                activeManagedBillingAccountOrderView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagedBillingAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagedBillingAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .select(
                        Struct.omit(
                          cte[
                            getViewName(activeManagedBillingAccountOrderView)
                          ],
                          "authorizedManagerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveFastForwardByOrderCustomerId = Effect.fn(
          "Invoices.Repository.findActiveFastForwardByOrderCustomerId",
        )(
          (
            customerId: OrdersSchema.Row["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.Row["tenantId"],
            excludeIds: Array<InvoicesSchema.Row["id"]>,
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
                        `${getViewName(activePlacedOrderView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activePlacedOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activePlacedOrderView.id,
                              ),
                              notInArray(activePlacedOrderView.id, excludeIds),
                            ),
                          )
                          .where(
                            and(
                              eq(activePlacedOrderView.customerId, customerId),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
                      .select(
                        Struct.omit(
                          cte[getViewName(activePlacedOrderView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
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

        const create = DataAccessContract.makeMutation(
          InvoicesContract.create,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("invoices:create"),
            mutator: (invoice, { tenantId }) =>
              repository
                .create({ ...invoice, tenantId })
                .pipe(Effect.map(Struct.omit("version"))),
          }),
        );

        return { create } as const;
      }),
    },
  ) {}
}
