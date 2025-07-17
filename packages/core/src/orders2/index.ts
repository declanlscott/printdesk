import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { AccessControl } from "../access-control2";
import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept } from "../utils/types";

export namespace Orders {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/orders/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.ordersTable.table;

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

        const update = Effect.fn("Orders.Repository.update")(
          (order: PartialExcept<schema.Order, "id" | "tenantId">) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(order)
                  .where(
                    and(
                      eq(table.id, order.id),
                      eq(table.tenantId, order.tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const delete_ = Effect.fn("Orders.Repository.delete")(
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

        return {
          create,
          findById,
          findByIds,
          update,
          delete: delete_,
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
                  Effect.map(
                    (order) =>
                      order.customerId === principal.userId && !order.deletedAt,
                  ),
                ),
            ),
        );

        const isManager = Effect.fn("Orders.Policy.isManager")(
          (id: schema.Order["id"]) =>
            AccessControl.policy((principal) =>
              repository
                .findById(id, principal.tenantId)
                .pipe(
                  Effect.map(
                    (order) =>
                      order.managerId === principal.userId && !order.deletedAt,
                  ),
                ),
            ),
        );

        return { isCustomer, isManager } as const;
      }),
    },
  ) {}
}
