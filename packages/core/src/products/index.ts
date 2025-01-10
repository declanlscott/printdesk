import { and, eq, getTableName, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  updateProductMutationArgsSchema,
} from "./shared";
import { productsTable } from "./sql";

import type { Product } from "./sql";

export namespace Products {
  export const create = fn(createProductMutationArgsSchema, async (values) => {
    await AccessControl.enforce([getTableName(productsTable), "create"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: getTableName(productsTable) }],
    });

    return useTransaction(async (tx) => {
      await tx.insert(productsTable).values(values);

      await afterTransaction(() => poke(["/tenant"]));
    });
  });

  export const read = async (ids: Array<Product["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(productsTable)
        .where(
          and(
            inArray(productsTable.id, ids),
            eq(productsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const update = fn(
    updateProductMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([getTableName(productsTable), "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(productsTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(productsTable)
          .set(values)
          .where(
            and(
              eq(productsTable.id, id),
              eq(productsTable.tenantId, useTenant().id),
            ),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const delete_ = fn(
    deleteProductMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([getTableName(productsTable), "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(productsTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(productsTable)
          .set(values)
          .where(
            and(
              eq(productsTable.id, id),
              eq(productsTable.tenantId, useTenant().id),
            ),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );
}
