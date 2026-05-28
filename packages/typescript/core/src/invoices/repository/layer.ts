import {
  and,
  eq,
  getTableColumns,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { InvoicesRepository } from ".";
import { Database } from "../../database";
import { orders } from "../../orders/sql";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { sharedAccounts } from "../../shared-accounts/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import {
  activeCustomerPlacedOrderInvoicesView,
  activeInvoicesView,
  activeManagerAuthorizedSharedAccountOrderInvoicesView,
  invoices,
} from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type {
  ActiveCustomerPlacedOrderInvoice,
  ActiveInvoice,
  ActiveManagerAuthorizedSharedAccountOrderInvoice,
  Invoice,
  InvoicesTable,
} from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = invoices.table;
  const activeView = activeInvoicesView;
  const activeManagerAuthorizedSharedAccountOrderView =
    activeManagerAuthorizedSharedAccountOrderInvoicesView;
  const activeCustomerPlacedOrderView = activeCustomerPlacedOrderInvoicesView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const create = Effect.fn("Invoices.Repository.create")((value: InferInsertModel<InvoicesTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findCreates = Effect.fn("Invoices.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${invoices.name}_creates`)
              .as(tx.select().from(table).where(eq(table.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveCreates = Effect.fn("Invoices.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeView)}_creates`)
              .as(tx.select().from(activeView).where(eq(activeView.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveCustomerPlacedOrderCreates = Effect.fn(
    "Invoices.Repository.findActiveCustomerPlacedOrderCreates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderInvoice["customerId"],
    ) =>
      entriesQueryBuilder.creates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx.$with(`${getViewName(activeCustomerPlacedOrderView)}_creates`).as(
              tx
                .select(
                  Struct.omit(getViewSelectedFields(activeCustomerPlacedOrderView), ["customerId"]),
                )
                .from(activeCustomerPlacedOrderView)
                .where(
                  and(
                    eq(activeCustomerPlacedOrderView.customerId, customerId),
                    eq(activeCustomerPlacedOrderView.tenantId, clientView.tenantId),
                  ),
                ),
            );

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountOrderCreates = Effect.fn(
    "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderInvoice["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.creates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountOrderView)}_creates`)
              .as(
                tx
                  .selectDistinctOn(
                    [
                      activeManagerAuthorizedSharedAccountOrderView.id,
                      activeManagerAuthorizedSharedAccountOrderView.tenantId,
                    ],
                    Struct.omit(
                      getViewSelectedFields(activeManagerAuthorizedSharedAccountOrderView),
                      ["authorizedManagerId"],
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
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
      ),
  );

  const findUpdates = Effect.fn("Invoices.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${invoices.name}_updates`)
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

            return tx.with(cte).select(cte[invoices.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveUpdates = Effect.fn("Invoices.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(invoices.name, clientView).pipe(
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
                      not(eq(entriesTable.entityVersion, activeView.version)),
                      eq(entriesTable.tenantId, activeView.tenantId),
                    ),
                  )
                  .where(eq(activeView.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveCustomerPlacedOrderUpdates = Effect.fn(
    "Invoices.Repository.findActiveCustomerPlacedOrderUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderInvoice["customerId"],
    ) =>
      entriesQueryBuilder.updates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerPlacedOrderView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerPlacedOrderView,
                    and(
                      eq(entriesTable.entityId, activeCustomerPlacedOrderView.id),
                      not(eq(entriesTable.entityVersion, activeCustomerPlacedOrderView.version)),
                      eq(entriesTable.tenantId, activeCustomerPlacedOrderView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerPlacedOrderView.customerId, customerId),
                      eq(activeView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .select(Struct.omit(cte[getViewName(activeCustomerPlacedOrderView)], ["customerId"]))
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountOrderUpdates = Effect.fn(
    "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderInvoice["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.updates(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountOrderView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountOrderView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountOrderView.id),
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
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountOrderView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findDeletes = Effect.fn("Invoices.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(invoices.name, clientView)
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

  const findActiveDeletes = Effect.fn("Invoices.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(invoices.name, clientView)
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
      clientView: ReplicacheClientView,
      customerId: ActiveCustomerPlacedOrderInvoice["customerId"],
    ) =>
      entriesQueryBuilder.deletes(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) =>
            qb.except(
              tx
                .select({ id: activeCustomerPlacedOrderView.id })
                .from(activeCustomerPlacedOrderView)
                .where(
                  and(
                    eq(activeCustomerPlacedOrderView.customerId, customerId),
                    eq(activeCustomerPlacedOrderView.tenantId, clientView.tenantId),
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
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrderInvoice["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.deletes(invoices.name, clientView).pipe(
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
                    eq(activeManagerAuthorizedSharedAccountOrderView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("Invoices.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Invoice["id"]>) =>
      entriesQueryBuilder.fastForward(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${invoices.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[invoices.name]).from(cte);
          }),
        ),
      ),
  );

  const findActiveFastForward = Effect.fn("Invoices.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveInvoice["id"]>) =>
      entriesQueryBuilder.fastForward(invoices.name, clientView).pipe(
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

            return tx.with(cte).select(cte[getViewName(activeView)]).from(cte);
          }),
        ),
      ),
  );

  const findActiveCustomerPlacedOrderFastForward = Effect.fn(
    "Invoices.Repository.findActiveCustomerPlacedOrderFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerPlacedOrderInvoice["id"]>,
      customerId: ActiveCustomerPlacedOrderInvoice["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeCustomerPlacedOrderView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerPlacedOrderView,
                    and(
                      eq(entriesTable.entityId, activeCustomerPlacedOrderView.id),
                      notInArray(activeCustomerPlacedOrderView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerPlacedOrderView.customerId, customerId),
                      eq(activeView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .select(Struct.omit(cte[getViewName(activeCustomerPlacedOrderView)], ["customerId"]))
              .from(cte);
          }),
        ),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountOrderFastForward = Effect.fn(
    "Invoices.Repository.findActiveManagerAuthorizedSharedAccountOrderFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountOrderInvoice["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountOrderInvoice["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.fastForward(invoices.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountOrderView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountOrderView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountOrderView.id),
                      notInArray(activeManagerAuthorizedSharedAccountOrderView.id, excludeIds),
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
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountOrderView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
      ),
  );

  const findByIdForUpdateWithSharedAccount = Effect.fn(
    "Invoices.Repository.findByIdForUpdateWithSharedAccount",
  )((id: Invoice["id"], tenantId: Invoice["tenantId"]) =>
    db
      .useTransaction((tx) =>
        tx
          .select({
            invoice: getTableColumns(table),
            sharedAccount: getTableColumns(sharedAccounts.table),
          })
          .from(table)
          .innerJoin(
            orders.table,
            and(eq(table.orderId, orders.table.id), eq(table.tenantId, orders.table.tenantId)),
          )
          .innerJoin(
            sharedAccounts.table,
            and(
              eq(orders.table.sharedAccountId, sharedAccounts.table.id),
              eq(orders.table.tenantId, sharedAccounts.table.tenantId),
            ),
          )
          .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
          .for("update", { of: table }),
      )
      .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Invoices.Repository.updateById")(
    (
      id: Invoice["id"],
      invoice: Partial<Omit<Invoice, "id" | "tenantId">>,
      tenantId: Invoice["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(invoice)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
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
    findByIdForUpdateWithSharedAccount,
    updateById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(InvoicesRepository));
