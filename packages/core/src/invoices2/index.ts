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
import { QueriesContract } from "../queries/contract";
import { Replicache } from "../replicache2";
import { ReplicacheNotifier } from "../replicache2/notifier";
import { ReplicacheClientViewEntriesSchema } from "../replicache2/schemas";
import { InvoicesContract } from "./contract";
import { InvoicesSchema } from "./schema";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewsSchema } from "../replicache2/schemas";

export namespace Invoices {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/invoices/Repository",
    {
      accessors: true,
      dependencies: [
        Database.TransactionManager.Default,
        Replicache.ClientViewEntriesQueryBuilder.Default,
      ],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = InvoicesSchema.table.definition;
        const activeView = InvoicesSchema.activeView;
        const activeManagerAuthorizedSharedAccountOrderView =
          InvoicesSchema.activeManagerAuthorizedSharedAccountOrderView;
        const activeCustomerPlacedOrderView =
          InvoicesSchema.activeCustomerPlacedOrderView;

        const entriesQueryBuilder =
          yield* Replicache.ClientViewEntriesQueryBuilder;
        const entriesTable = ReplicacheClientViewEntriesSchema.table.definition;

        const create = Effect.fn("Invoices.Repository.create")(
          (invoice: InferInsertModel<InvoicesSchema.Table>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(invoice).returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findCreates = Effect.fn("Invoices.Repository.findCreates")(
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
          "Invoices.Repository.findActiveCreates",
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

        const findActiveCustomerPlacedOrderCreates = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
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

        const findActiveManagerAuthorizedSharedAccountOrderCreates = Effect.fn(
          "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderCreates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
          ) =>
            entriesQueryBuilder.creates(getTableName(table), clientView).pipe(
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

        const findUpdates = Effect.fn("Invoices.Repository.findUpdates")(
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
          "Invoices.Repository.findActiveUpdates",
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

        const findActiveCustomerPlacedOrderUpdates = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderUpdates",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                              entriesTable.entityId,
                              activeCustomerPlacedOrderView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeCustomerPlacedOrderView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
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
                            eq(activeView.tenantId, clientView.tenantId),
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
          ) =>
            entriesQueryBuilder.updates(getTableName(table), clientView).pipe(
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
                              entriesTable.entityId,
                              activeManagerAuthorizedSharedAccountOrderView.id,
                            ),
                            not(
                              eq(
                                entriesTable.entityVersion,
                                activeManagerAuthorizedSharedAccountOrderView.version,
                              ),
                            ),
                            eq(
                              entriesTable.tenantId,
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
                              clientView.tenantId,
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
          "Invoices.Repository.findActiveDeletes",
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

        const findActiveCustomerPlacedOrderDeletes = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderDeletes",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
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
                            clientView.tenantId,
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
            clientView: ReplicacheClientViewsSchema.Row,
            managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
          ) =>
            entriesQueryBuilder.deletes(getTableName(table), clientView).pipe(
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
          "Invoices.Repository.findFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<InvoicesSchema.Row["id"]>,
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
          "Invoices.Repository.findActiveFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<InvoicesSchema.ActiveRow["id"]>,
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

        const findActiveCustomerPlacedOrderFastForward = Effect.fn(
          "Invoices.Repository.findActiveCustomerPlacedOrderFastForward",
        )(
          (
            clientView: ReplicacheClientViewsSchema.Row,
            excludeIds: Array<
              InvoicesSchema.ActiveCustomerPlacedOrderRow["id"]
            >,
            customerId: InvoicesSchema.ActiveCustomerPlacedOrderRow["customerId"],
          ) =>
            entriesQueryBuilder
              .fastForward(getTableName(table), clientView)
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
                                entriesTable.entityId,
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
                              eq(activeView.tenantId, clientView.tenantId),
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
              clientView: ReplicacheClientViewsSchema.Row,
              excludeIds: Array<
                InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["id"]
              >,
              managerId: InvoicesSchema.ActiveManagerAuthorizedBillingAccountOrderRow["authorizedManagerId"],
            ) =>
              entriesQueryBuilder
                .fastForward(getTableName(table), clientView)
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
                                  entriesTable.entityId,
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
                                  clientView.tenantId,
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

  export class Queries extends Effect.Service<Queries>()(
    "@printdesk/core/invoices/Queries",
    {
      accessors: true,
      dependencies: [Repository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* Repository;

        const differenceResolver =
          new QueriesContract.DifferenceResolverBuilder({
            entity: getTableName(InvoicesSchema.table.definition),
          })
            .query(AccessControl.permission("invoices:read"), {
              findCreates: repository.findCreates,
              findUpdates: repository.findUpdates,
              findDeletes: repository.findDeletes,
              fastForward: repository.findFastForward,
            })
            .query(AccessControl.permission("active_invoices:read"), {
              findCreates: repository.findActiveCreates,
              findUpdates: repository.findActiveUpdates,
              findDeletes: repository.findActiveDeletes,
              fastForward: repository.findActiveFastForward,
            })
            .query(
              AccessControl.permission(
                "active_customer_placed_order_invoices:read",
              ),
              {
                findCreates: repository.findActiveCustomerPlacedOrderCreates,
                findUpdates: repository.findActiveCustomerPlacedOrderUpdates,
                findDeletes: repository.findActiveCustomerPlacedOrderDeletes,
                fastForward:
                  repository.findActiveCustomerPlacedOrderFastForward,
              },
            )
            .query(
              AccessControl.permission(
                "active_manager_authorized_shared_account_order_invoices:read",
              ),
              {
                findCreates:
                  repository.findActiveManagerAuthorizedSharedAccountOrderCreates,
                findUpdates:
                  repository.findActiveManagerAuthorizedSharedAccountOrderUpdates,
                findDeletes:
                  repository.findActiveManagerAuthorizedSharedAccountOrderDeletes,
                fastForward:
                  repository.findActiveManagerAuthorizedSharedAccountOrderFastForward,
              },
            )
            .build();

        return { differenceResolver } as const;
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
                .pipe(Effect.tap(notifyCreate)),
          ),
        });

        return { create } as const;
      }),
    },
  ) {}
}
