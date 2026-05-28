import {
  and,
  eq,
  getTableColumns,
  getViewName,
  getViewSelectedFields,
  inArray,
  not,
  notInArray,
  or,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { OrdersRepository } from ".";
import { Database } from "../../database";
import { products } from "../../products/sql";
import { replicacheClientViewEntries } from "../../replicache/sql";
import { SyncQueryBuilder } from "../../sync/query-builder";
import { workflowStatuses } from "../../workflows/sql";
import { OrdersContract } from "../contract";
import { OrdersShortIdGenerator } from "../short-id-generator";
import { activeManagerAuthorizedSharedAccountOrdersView, activeOrdersView, orders } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView } from "../../replicache/sql";
import type { WorkflowStatus } from "../../workflows/sql";
import type {
  ActiveCustomerPlacedOrder,
  ActiveManagerAuthorizedSharedAccountOrder,
  ActiveOrder,
  Order,
  OrdersTable,
} from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = orders.table;
  const activeView = activeOrdersView;
  const activeCustomerPlacedView = activeOrdersView;
  const activeManagerAuthorizedSharedAccountView = activeManagerAuthorizedSharedAccountOrdersView;

  const entriesQueryBuilder = yield* SyncQueryBuilder;
  const entriesTable = replicacheClientViewEntries.table;

  const shortIdGenerator = yield* OrdersShortIdGenerator;

  const create = Effect.fn("Orders.Repository.create")((value: InferInsertModel<OrdersTable>) =>
    Effect.all(
      [
        db
          .useTransaction((tx) => tx.insert(table).values(value).returning())
          .pipe(
            Effect.map(Array.head),
            Effect.flatMap(Effect.fromOption),
            Effect.map((order) => order as Order),
          ),
        db
          .useTransaction((tx) =>
            tx
              .select({ roomId: products.table.roomId })
              .from(products.table)
              .where(
                and(
                  eq(products.table.id, value.productId),
                  eq(products.table.tenantId, value.tenantId),
                ),
              ),
          )
          .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
      ],
      { concurrency: "unbounded" },
    ).pipe(
      Effect.catchTag("NoSuchElementError", Effect.die),
      Effect.flatMap(([order, { roomId }]) =>
        db
          .afterTransaction(
            shortIdGenerator.generate({ tenantId: order.tenantId, roomId }).pipe(
              Effect.flatMap((shortId) => updateById(order.id, { shortId }, order.tenantId)),
              Effect.catch((error) =>
                Effect.logError(
                  `[Orders.Repository]: Failed to save short ID for order "${order.id}":`,
                  error,
                ),
              ),
            ),
          )
          .pipe(Effect.as(order)),
      ),
    ),
  );

  const findCreates = Effect.fn("Orders.Repository.findCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orders.name}_creates`)
              .as(tx.select().from(table).where(eq(table.tenantId, clientView.tenantId)));

            return tx
              .with(cte)
              .select()
              .from(cte)
              .where(inArray(cte.id, tx.select({ id: cte.id }).from(cte).except(qb)));
          }),
        ),
        Effect.map((orders) => orders as Array<Order>),
      ),
  );

  const findActiveCreates = Effect.fn("Orders.Repository.findActiveCreates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.creates(orders.name, clientView).pipe(
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
        Effect.map((orders) => orders as Array<ActiveOrder>),
      ),
  );

  const findActiveCustomerPlacedCreates = Effect.fn(
    "Orders.Repository.findActiveCustomerPlacedCreates",
  )((clientView: ReplicacheClientView, customerId: ActiveOrder["customerId"]) =>
    entriesQueryBuilder.creates(orders.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx.$with(`${OrdersContract.ActiveCustomerPlacedView.name}_creates`).as(
            tx
              .select()
              .from(activeCustomerPlacedView)
              .where(
                and(
                  eq(activeCustomerPlacedView.customerId, customerId),
                  eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
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
      Effect.map((orders) => orders as Array<ActiveCustomerPlacedOrder>),
    ),
  );

  const findActiveManagerAuthorizedSharedAccountCreates = Effect.fn(
    "Orders.Repository.findActiveManagerAuthorizedSharedAccountCreates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrder["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.creates(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_creates`)
              .as(
                tx
                  .selectDistinctOn(
                    [
                      activeManagerAuthorizedSharedAccountView.id,
                      activeManagerAuthorizedSharedAccountView.tenantId,
                    ],
                    Struct.omit(getViewSelectedFields(activeManagerAuthorizedSharedAccountView), [
                      "authorizedManagerId",
                    ]),
                  )
                  .from(activeManagerAuthorizedSharedAccountView)
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
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
        Effect.map((orders) => orders as Array<ActiveOrder>),
      ),
  );

  const findUpdates = Effect.fn("Orders.Repository.findUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orders.name}_updates`)
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

            return tx.with(cte).select(cte[orders.name]).from(cte);
          }),
        ),
        Effect.map((orders) => orders as Array<Order>),
      ),
  );

  const findActiveUpdates = Effect.fn("Orders.Repository.findActiveUpdates")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder.updates(orders.name, clientView).pipe(
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
        Effect.map((orders) => orders as Array<ActiveOrder>),
      ),
  );

  const findActiveCustomerPlacedUpdates = Effect.fn(
    "Orders.Repository.findActiveCustomerPlacedUpdates",
  )((clientView: ReplicacheClientView, customerId: ActiveOrder["customerId"]) =>
    entriesQueryBuilder.updates(orders.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) => {
          const cte = tx
            .$with(`${OrdersContract.ActiveCustomerPlacedView.name}_updates`)
            .as(
              qb
                .innerJoin(
                  activeCustomerPlacedView,
                  and(
                    eq(entriesTable.entityId, activeCustomerPlacedView.id),
                    not(eq(entriesTable.entityVersion, activeCustomerPlacedView.version)),
                    eq(entriesTable.tenantId, activeCustomerPlacedView.tenantId),
                  ),
                )
                .where(
                  and(
                    eq(activeCustomerPlacedView.customerId, customerId),
                    eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
                  ),
                ),
            );

          return tx.with(cte).select(cte[getViewName(activeCustomerPlacedView)]).from(cte);
        }),
      ),
      Effect.map((orders) => orders as Array<ActiveCustomerPlacedOrder>),
    ),
  );

  const findActiveManagerAuthorizedSharedAccountUpdates = Effect.fn(
    "Orders.Repository.findActiveManagerAuthorizedSharedAccountUpdates",
  )(
    (
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrder["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.updates(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_updates`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountView.id),
                      not(
                        eq(
                          entriesTable.entityVersion,
                          activeManagerAuthorizedSharedAccountView.version,
                        ),
                      ),
                      eq(entriesTable.tenantId, activeManagerAuthorizedSharedAccountView.tenantId),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
        Effect.map((orders) => orders as Array<ActiveOrder>),
      ),
  );

  const findDeletes = Effect.fn("Orders.Repository.findDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(orders.name, clientView)
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

  const findActiveDeletes = Effect.fn("Orders.Repository.findActiveDeletes")(
    (clientView: ReplicacheClientView) =>
      entriesQueryBuilder
        .deletes(orders.name, clientView)
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

  const findActiveCustomerPlacedDeletes = Effect.fn(
    "Orders.Repository.findActiveCustomerPlacedDeletes",
  )((clientView: ReplicacheClientView, customerId: ActiveCustomerPlacedOrder["customerId"]) =>
    entriesQueryBuilder.deletes(orders.name, clientView).pipe(
      Effect.flatMap((qb) =>
        db.useTransaction((tx) =>
          qb.except(
            tx
              .select({ id: activeCustomerPlacedView.id })
              .from(activeCustomerPlacedView)
              .where(
                and(
                  eq(activeCustomerPlacedView.customerId, customerId),
                  eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
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
      clientView: ReplicacheClientView,
      managerId: ActiveManagerAuthorizedSharedAccountOrder["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.deletes(orders.name, clientView).pipe(
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
                    eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                    eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                  ),
                ),
            ),
          ),
        ),
      ),
  );

  const findFastForward = Effect.fn("Orders.Repository.findFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<Order["id"]>) =>
      entriesQueryBuilder.fastForward(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${orders.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    table,
                    and(eq(entriesTable.entityId, table.id), notInArray(table.id, excludeIds)),
                  )
                  .where(eq(table.tenantId, clientView.tenantId)),
              );

            return tx.with(cte).select(cte[orders.name]).from(cte);
          }),
        ),
        Effect.map((orders) => orders as Array<Order>),
      ),
  );

  const findActiveFastForward = Effect.fn("Orders.Repository.findActiveFastForward")(
    (clientView: ReplicacheClientView, excludeIds: Array<ActiveOrder["id"]>) =>
      entriesQueryBuilder.fastForward(orders.name, clientView).pipe(
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
        Effect.map((orders) => orders as Array<ActiveOrder>),
      ),
  );

  const findActiveCustomerPlacedFastForward = Effect.fn(
    "Orders.Repository.findActiveCustomerPlacedFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveCustomerPlacedOrder["id"]>,
      customerId: ActiveCustomerPlacedOrder["customerId"],
    ) =>
      entriesQueryBuilder.fastForward(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${OrdersContract.ActiveCustomerPlacedView.name}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeCustomerPlacedView,
                    and(
                      eq(entriesTable.entityId, activeCustomerPlacedView.id),
                      notInArray(activeCustomerPlacedView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeCustomerPlacedView.customerId, customerId),
                      eq(activeCustomerPlacedView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx.with(cte).select(cte[getViewName(activeCustomerPlacedView)]).from(cte);
          }),
        ),
        Effect.map((orders) => orders as Array<ActiveCustomerPlacedOrder>),
      ),
  );

  const findActiveManagerAuthorizedSharedAccountFastForward = Effect.fn(
    "Orders.Repository.findActiveManagerAuthorizedSharedAccountFastForward",
  )(
    (
      clientView: ReplicacheClientView,
      excludeIds: Array<ActiveManagerAuthorizedSharedAccountOrder["id"]>,
      managerId: ActiveManagerAuthorizedSharedAccountOrder["authorizedManagerId"],
    ) =>
      entriesQueryBuilder.fastForward(orders.name, clientView).pipe(
        Effect.flatMap((qb) =>
          db.useTransaction((tx) => {
            const cte = tx
              .$with(`${getViewName(activeManagerAuthorizedSharedAccountView)}_fast_forward`)
              .as(
                qb
                  .innerJoin(
                    activeManagerAuthorizedSharedAccountView,
                    and(
                      eq(entriesTable.entityId, activeManagerAuthorizedSharedAccountView.id),
                      notInArray(activeManagerAuthorizedSharedAccountView.id, excludeIds),
                    ),
                  )
                  .where(
                    and(
                      eq(activeManagerAuthorizedSharedAccountView.authorizedManagerId, managerId),
                      eq(activeManagerAuthorizedSharedAccountView.tenantId, clientView.tenantId),
                    ),
                  ),
              );

            return tx
              .with(cte)
              .selectDistinctOn(
                [
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].id,
                  cte[getViewName(activeManagerAuthorizedSharedAccountView)].tenantId,
                ],
                Struct.omit(cte[getViewName(activeManagerAuthorizedSharedAccountView)], [
                  "authorizedManagerId",
                ]),
              )
              .from(cte);
          }),
        ),
        Effect.map((orders) => orders as Array<ActiveOrder>),
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
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((order) => order as Order),
        ),
  );

  const findByIdWithWorkflowStatus = Effect.fn("Orders.Repository.findByIdWithWorkflowStatus")(
    (id: Order["id"], tenantId: Order["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              order: getTableColumns(table),
              workflowStatus: getTableColumns(workflowStatuses.table),
            })
            .from(table)
            .innerJoin(
              workflowStatuses.table,
              and(
                or(
                  eq(table.roomWorkflowStatusId, workflowStatuses.table.id),
                  eq(table.sharedAccountWorkflowStatusId, workflowStatuses.table.id),
                ),
                eq(table.tenantId, workflowStatuses.table.tenantId),
              ),
            )
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map(
            (orderWithWorkflowStatus) =>
              orderWithWorkflowStatus as {
                order: Order;
                workflowStatus: WorkflowStatus;
              },
          ),
        ),
  );

  const findByWorkflowStatusId = Effect.fn("Orders.Repository.findByWorkflowStatusId")(
    (workflowStatusId: WorkflowStatus["id"], tenantId: Order["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(
              and(
                or(
                  eq(table.roomWorkflowStatusId, workflowStatusId),
                  eq(table.sharedAccountWorkflowStatusId, workflowStatusId),
                ),
                eq(table.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map((orders) => orders as Array<Order>)),
  );

  const findActiveManagerIds = Effect.fn("Orders.Repository.findActiveManagerIds")(
    (id: Order["id"], tenantId: Order["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              managerId: activeManagerAuthorizedSharedAccountView.authorizedManagerId,
            })
            .from(activeManagerAuthorizedSharedAccountView)
            .where(
              and(
                eq(activeManagerAuthorizedSharedAccountView.id, id),
                eq(activeManagerAuthorizedSharedAccountView.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.map(Struct.get("managerId")))),
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
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map((order) => order as Order),
        ),
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
});

export const layer = makeService.pipe(Layer.effect(OrdersRepository));
