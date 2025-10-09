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
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import { Events } from "../events2";
import { MutationsContract } from "../mutations/contract";
import { Orders } from "../orders2";
import { OrdersContract } from "../orders2/contract";
import { Permissions } from "../permissions2";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewMetadataSchema } from "../replicache2/schemas";
import { InvoicesContract } from "./contract";
import { InvoicesSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";

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
        const table = InvoicesSchema.table.definition;
        const activeView = InvoicesSchema.activeView;
        const activeManagerAuthorizedSharedAccountOrderView =
          InvoicesSchema.activeManagerAuthorizedSharedAccountOrderView;
        const activeCustomerPlacedOrderView =
          InvoicesSchema.activeCustomerPlacedOrderView;

        const metadataQb = yield* Replicache.ClientViewMetadataQueryBuilder;
        const metadataTable =
          ReplicacheClientViewMetadataSchema.table.definition;

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
          "Invoices.Repository.findActiveCreates",
        )(
          (
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerPlacedOrderCreates = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderCreates",
        )(
          (
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveCustomerPlacedOrderRow["tenantId"],
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
                        `${getViewName(activeCustomerPlacedOrderView)}_creates`,
                      )
                      .as(
                        tx
                          .select(
                            Struct.omit(
                              getViewSelectedFields(
                                activeCustomerPlacedOrderView,
                              ),
                              "customerId",
                            ),
                          )
                          .from(activeCustomerPlacedOrderView)
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedOrderView.customerId,
                                customerId,
                              ),
                              eq(
                                activeCustomerPlacedOrderView.tenantId,
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

        const findActiveManagerAuthorizedSharedAccountOrderCreates = Effect.fn(
          "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderCreates",
        )(
          (
            managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["tenantId"],
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
                        `${getViewName(activeManagerAuthorizedSharedAccountOrderView)}_creates`,
                      )
                      .as(
                        tx
                          .selectDistinctOn(
                            [
                              activeManagerAuthorizedSharedAccountOrderView.id,
                              activeManagerAuthorizedSharedAccountOrderView.tenantId,
                            ],
                            Struct.omit(
                              getViewSelectedFields(
                                activeManagerAuthorizedSharedAccountOrderView,
                              ),
                              "authorizedManagerId",
                            ),
                          )
                          .from(activeManagerAuthorizedSharedAccountOrderView)
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedSharedAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedSharedAccountOrderView.tenantId,
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveUpdates = Effect.fn(
          "Invoices.Repository.findActiveUpdates",
        )(
          (
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerPlacedOrderUpdates = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderUpdates",
        )(
          (
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveCustomerPlacedOrderRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeCustomerPlacedOrderView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerPlacedOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeCustomerPlacedOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeCustomerPlacedOrderView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeCustomerPlacedOrderView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedOrderView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(
                        Struct.omit(
                          cte[getViewName(activeCustomerPlacedOrderView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountOrderUpdates = Effect.fn(
          "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderUpdates",
        )(
          (
            managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["tenantId"],
          ) =>
            metadataQb
              .updates(getTableName(table), clientGroupId, tenantId)
              .pipe(
                Effect.flatMap((qb) =>
                  db.useTransaction((tx) => {
                    const cte = tx
                      .$with(
                        `${getViewName(activeManagerAuthorizedSharedAccountOrderView)}_updates`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeManagerAuthorizedSharedAccountOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeManagerAuthorizedSharedAccountOrderView.id,
                              ),
                              not(
                                eq(
                                  metadataTable.entityVersion,
                                  activeManagerAuthorizedSharedAccountOrderView.version,
                                ),
                              ),
                              eq(
                                metadataTable.tenantId,
                                activeManagerAuthorizedSharedAccountOrderView.tenantId,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeManagerAuthorizedSharedAccountOrderView.authorizedManagerId,
                                managerId,
                              ),
                              eq(
                                activeManagerAuthorizedSharedAccountOrderView.tenantId,
                                tenantId,
                              ),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(
                        Struct.omit(
                          cte[
                            getViewName(
                              activeManagerAuthorizedSharedAccountOrderView,
                            )
                          ],
                          "authorizedManagerId",
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
            tenantId: InvoicesSchema.ActiveRow["tenantId"],
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

        const findActiveCustomerPlacedOrderDeletes = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderDeletes",
        )(
          (
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveCustomerPlacedOrderRow["tenantId"],
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
                        .select({ id: activeCustomerPlacedOrderView.id })
                        .from(activeCustomerPlacedOrderView)
                        .where(
                          and(
                            eq(
                              activeCustomerPlacedOrderView.customerId,
                              customerId,
                            ),
                            eq(
                              activeCustomerPlacedOrderView.tenantId,
                              tenantId,
                            ),
                          ),
                        ),
                    ),
                  ),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountOrderDeletes = Effect.fn(
          "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderDeletes",
        )(
          (
            managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["tenantId"],
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
                            activeManagerAuthorizedSharedAccountOrderView.id,
                            activeManagerAuthorizedSharedAccountOrderView.tenantId,
                          ],
                          {
                            id: activeManagerAuthorizedSharedAccountOrderView.id,
                          },
                        )
                        .from(activeManagerAuthorizedSharedAccountOrderView)
                        .where(
                          and(
                            eq(
                              activeManagerAuthorizedSharedAccountOrderView.authorizedManagerId,
                              managerId,
                            ),
                            eq(
                              activeManagerAuthorizedSharedAccountOrderView.tenantId,
                              tenantId,
                            ),
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

                    return tx
                      .with(cte)
                      .select(cte[getTableName(table)])
                      .from(cte);
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
            tenantId: InvoicesSchema.ActiveRow["tenantId"],
            excludeIds: Array<InvoicesSchema.ActiveRow["id"]>,
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

        const findActiveCustomerPlacedOrderFastForward = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderFastForward",
        )(
          (
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: InvoicesSchema.ActiveCustomerPlacedOrderRow["tenantId"],
            excludeIds: Array<
              InvoicesSchema.ActiveCustomerPlacedOrderRow["id"]
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
                        `${getViewName(activeCustomerPlacedOrderView)}_fast_forward`,
                      )
                      .as(
                        qb
                          .innerJoin(
                            activeCustomerPlacedOrderView,
                            and(
                              eq(
                                metadataTable.entityId,
                                activeCustomerPlacedOrderView.id,
                              ),
                              notInArray(
                                activeCustomerPlacedOrderView.id,
                                excludeIds,
                              ),
                            ),
                          )
                          .where(
                            and(
                              eq(
                                activeCustomerPlacedOrderView.customerId,
                                customerId,
                              ),
                              eq(activeView.tenantId, tenantId),
                            ),
                          ),
                      );

                    return tx
                      .with(cte)
                      .select(
                        Struct.omit(
                          cte[getViewName(activeCustomerPlacedOrderView)],
                          "customerId",
                        ),
                      )
                      .from(cte);
                  }),
                ),
              ),
        );

        const findActiveManagerAuthorizedSharedAccountOrderFastForward =
          Effect.fn(
            "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderFastForward",
          )(
            (
              managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
              clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
              clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
              tenantId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["tenantId"],
              excludeIds: Array<
                InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["id"]
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
                          `${getViewName(activeManagerAuthorizedSharedAccountOrderView)}_fast_forward`,
                        )
                        .as(
                          qb
                            .innerJoin(
                              activeManagerAuthorizedSharedAccountOrderView,
                              and(
                                eq(
                                  metadataTable.entityId,
                                  activeManagerAuthorizedSharedAccountOrderView.id,
                                ),
                                notInArray(
                                  activeManagerAuthorizedSharedAccountOrderView.id,
                                  excludeIds,
                                ),
                              ),
                            )
                            .where(
                              and(
                                eq(
                                  activeManagerAuthorizedSharedAccountOrderView.authorizedManagerId,
                                  managerId,
                                ),
                                eq(
                                  activeManagerAuthorizedSharedAccountOrderView.tenantId,
                                  tenantId,
                                ),
                              ),
                            ),
                        );

                      return tx
                        .with(cte)
                        .select(
                          Struct.omit(
                            cte[
                              getViewName(
                                activeManagerAuthorizedSharedAccountOrderView,
                              )
                            ],
                            "authorizedManagerId",
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
          findActiveCustomerPlacedOrderCreates,
          findActiveManagerAuthorizedSharedAccountOrderCreates,
          findUpdates,
          findActiveUpdates,
          findActiveCustomerPlacedOrderUpdates,
          findActiveManagerAuthorizedSharedAccountOrderUpdates,
          findDeletes,
          findActiveDeletes,
          findActiveCustomerPlacedOrderDeletes,
          findActiveManagerAuthorizedSharedAccountOrderDeletes,
          findFastForward,
          findActiveFastForward,
          findActiveCustomerPlacedOrderFastForward,
          findActiveManagerAuthorizedSharedAccountOrderFastForward,
        } as const;
      }),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/invoices/Mutations",
    {
      accessors: true,
      dependencies: [
        Repository.Default,
        Orders.Repository.Default,
        Permissions.Schemas.Default,
      ],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const notifier = yield* ReplicacheNotifier;
        const PullPermission = yield* Events.ReplicachePullPermission;

        const notifyCreate = (invoice: InvoicesContract.DataTransferObject) =>
          notifier.notify(
            Array.make(
              PullPermission.make({ permission: "invoices:read" }),
              PullPermission.make({
                permission: "active_invoices:read",
              }),
              Events.makeReplicachePullPolicy(
                OrdersContract.isCustomerOrManager.make({
                  id: invoice.orderId,
                }),
              ),
              Events.makeReplicachePullPolicy(
                OrdersContract.isManagerAuthorized.make({
                  id: invoice.orderId,
                }),
              ),
            ),
          );

        const create = MutationsContract.makeMutation(InvoicesContract.create, {
          makePolicy: Effect.fn("Invoices.Mutations.create.makePolicy")(() =>
            AccessControl.permission("invoices:create"),
          ),
          mutator: Effect.fn("Invoices.Mutations.create.mutator")(
            (invoice, { tenantId }) =>
              repository
                .create({ ...invoice, tenantId })
                .pipe(
                  Effect.map(Struct.omit("version")),
                  Effect.tap(notifyCreate),
                ),
          ),
        });

        return { create } as const;
      }),
    },
  ) {}
}
