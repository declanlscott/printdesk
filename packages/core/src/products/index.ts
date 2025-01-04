import { and, eq, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { Replicache } from "../replicache";
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
    await AccessControl.enforce([productsTable._.name, "create"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: productsTable._.name }],
    });

    return useTransaction(async (tx) => {
      await tx.insert(productsTable).values(values);

      await afterTransaction(() => Replicache.poke(["/tenant"]));
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
      await AccessControl.enforce([productsTable._.name, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTable._.name, id }],
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

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );

  export const delete_ = fn(
    deleteProductMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([productsTable._.name, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTable._.name, id }],
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

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );
}
