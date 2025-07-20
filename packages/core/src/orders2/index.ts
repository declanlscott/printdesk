import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Orders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/orders/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.ordersTable.table;
        const activeView = schema.activeOrdersView.view;
        const activeBillingAccountsView = schema.activeBillingAccountsView.view;
        const activeBillingAccountManagerAuthorizationsView =
          schema.activeBillingAccountManagerAuthorizationsView.view;

        const create = Effect.fn("Orders.Repository.create")(
          (order: InferInsertModel<schema.OrdersTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(order).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Orders.Repository.getMetadata")(
          (tenantId: schema.Order["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, version: table.version })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Orders.Repository.getActiveMetadata",
        )((tenantId: schema.Order["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, version: activeView.version })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActiveMetadataByBillingAccountManagerId = Effect.fn(
          "Orders.Repository.getActiveMetadataByBillingAccountManagerId",
        )(
          (
            managerId: schema.BillingAccountManagerAuthorization["managerId"],
            tenantId: schema.Order["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .innerJoin(
                  activeBillingAccountsView,
                  and(
                    eq(
                      activeView.billingAccountId,
                      activeBillingAccountsView.id,
                    ),
                    eq(activeView.tenantId, activeBillingAccountsView.tenantId),
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
        );

        const getActiveMetadataByCustomerId = Effect.fn(
          "Orders.Repository.getActiveMetadataByCustomerId",
        )(
          (
            customerId: schema.Order["customerId"],
            tenantId: schema.Order["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: activeView.id, version: activeView.version })
                .from(activeView)
                .where(
                  and(
                    eq(activeView.customerId, customerId),
                    eq(activeView.tenantId, tenantId),
                  ),
                ),
            ),
        );

        const findById = Effect.fn("Orders.Repository.findById")(
          (id: schema.Order["id"], tenantId: schema.Order["tenantId"]) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIds = Effect.fn("Orders.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Order["id"]>,
            tenantId: schema.Order["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const updateById = Effect.fn("Orders.Repository.updateById")(
          (
            id: schema.Order["id"],
            order: Partial<Omit<schema.Order, "id" | "tenantId">>,
            tenantId: schema.Order["tenantId"],
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
            id: schema.Order["id"],
            deletedAt: NonNullable<schema.Order["deletedAt"]>,
            tenantId: schema.Order["tenantId"],
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
            productId: schema.Order["productId"],
            deletedAt: NonNullable<schema.Order["deletedAt"]>,
            tenantId: schema.Order["tenantId"],
          ) =>
            db.useTransaction((tx) =>
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
            ),
        );

        return {
          create,
          getMetadata,
          getActiveMetadata,
          getActiveMetadataByBillingAccountManagerId,
          getActiveMetadataByCustomerId,
          findById,
          findByIds,
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
          (id: schema.Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map((order) => order.customerId === principal.userId),
                ),
            ),
        );

        const isManager = Effect.fn("Orders.Policy.isManager")(
          (id: schema.Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map((order) => order.managerId === principal.userId),
                ),
            ),
        );

        return { isCustomer, isManager } as const;
      }),
    },
  ) {}
}
