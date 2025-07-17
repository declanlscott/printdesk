import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept } from "../utils/types";

export namespace Products {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/products/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.productsTable.table;

        const create = Effect.fn("Products.Repository.create")(
          (product: InferInsertModel<schema.ProductsTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(product).returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findByIds = Effect.fn("Products.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Product["id"]>,
            tenantId: schema.Product["tenantId"],
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

        const update = Effect.fn("Products.Repository.update")(
          (product: PartialExcept<schema.Product, "id" | "tenantId">) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(product)
                  .where(
                    and(
                      eq(table.id, product.id),
                      eq(table.tenantId, product.tenantId),
                    ),
                  )
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const delete_ = Effect.fn("Products.Repository.delete")(
          (
            id: schema.Product["id"],
            deletedAt: schema.Product["deletedAt"],
            tenantId: schema.Product["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .update(table)
                .set({ deletedAt })
                .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
            ),
        );

        return { create, findByIds, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
