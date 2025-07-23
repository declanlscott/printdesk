import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import {
  activeProductsView,
  activePublishedProductsView,
  productsTable,
} from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Product, ProductsTable } from "./sql";

export namespace Products {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/products/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = productsTable;
        const activeView = activeProductsView;
        const activePublishedView = activePublishedProductsView;

        const create = Effect.fn("Products.Repository.create")(
          (product: InferInsertModel<ProductsTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(product).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const getMetadata = Effect.fn("Products.Repository.getMetadata")(
          (tenantId: Product["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select({ id: table.id, name: table.name })
                .from(table)
                .where(eq(table.tenantId, tenantId)),
            ),
        );

        const getActiveMetadata = Effect.fn(
          "Products.Repository.getActiveMetadata",
        )((tenantId: Product["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({ id: activeView.id, name: activeView.name })
              .from(activeView)
              .where(eq(activeView.tenantId, tenantId)),
          ),
        );

        const getActivePublishedMetadata = Effect.fn(
          "Products.Repository.getActivePublishedMetadata",
        )((tenantId: Product["tenantId"]) =>
          db.useTransaction((tx) =>
            tx
              .select({
                id: activePublishedView.id,
                version: activePublishedView.version,
              })
              .from(activePublishedView)
              .where(eq(activePublishedView.tenantId, tenantId)),
          ),
        );

        const findByIds = Effect.fn("Products.Repository.findByIds")(
          (ids: ReadonlyArray<Product["id"]>, tenantId: Product["tenantId"]) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        const updateById = Effect.fn("Products.Repository.updateById")(
          (
            id: Product["id"],
            product: Partial<Omit<Product, "id" | "tenantId">>,
            tenantId: Product["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(product)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const deleteById = Effect.fn("Products.Repository.deleteById")(
          (
            id: Product["id"],
            deletedAt: NonNullable<Product["deletedAt"]>,
            tenantId: Product["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ deletedAt })
                .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
            ),
        );

        const deleteByRoomId = Effect.fn("Products.Repository.deleteByRoomId")(
          (
            roomId: Product["roomId"],
            deletedAt: NonNullable<Product["deletedAt"]>,
            tenantId: Product["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ deletedAt })
                .where(
                  and(eq(table.roomId, roomId), eq(table.tenantId, tenantId)),
                )
                .returning(),
            ),
        );

        return {
          create,
          getMetadata,
          getActiveMetadata,
          getActivePublishedMetadata,
          findByIds,
          updateById,
          deleteById,
          deleteByRoomId,
        } as const;
      }),
    },
  ) {}
}
