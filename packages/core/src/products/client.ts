import { AccessControl } from "../access-control/client";
import { SharedErrors } from "../errors/shared";
import { Replicache } from "../replicache/client";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  productsTableName,
  updateProductMutationArgsSchema,
} from "./shared";

import type { Product } from "./sql";

export namespace Products {
  export const create = Replicache.createMutator(
    createProductMutationArgsSchema,
    {
      authorizer: async (tx, user) =>
        AccessControl.enforce([tx, user, productsTableName, "create"], {
          Error: SharedErrors.AccessDenied,
          args: [{ name: productsTableName }],
        }),
      getMutator: () => async (tx, values) =>
        Replicache.set(tx, productsTableName, values.id, values),
    },
  );

  export const all = Replicache.createQuery({
    getQuery: () => async (tx) => Replicache.scan(tx, productsTableName),
  });

  export const byId = Replicache.createQuery({
    getDeps: (id: Product["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, productsTableName, id),
  });

  export const update = Replicache.createMutator(
    updateProductMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, productsTableName, "update"], {
          Error: SharedErrors.AccessDenied,
          args: [{ name: productsTableName, id }],
        }),
      getMutator:
        () =>
        async (tx, { id, ...values }) => {
          const prev = await Replicache.get(tx, productsTableName, id);

          return Replicache.set(tx, productsTableName, id, {
            ...prev,
            ...values,
          });
        },
    },
  );

  export const delete_ = Replicache.createMutator(
    deleteProductMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, productsTableName, "delete"], {
          Error: SharedErrors.AccessDenied,
          args: [{ name: productsTableName, id }],
        }),
      getMutator:
        ({ user }) =>
        async (tx, values) => {
          if (user.role === "administrator") {
            const prev = await Replicache.get(tx, productsTableName, values.id);

            return Replicache.set(tx, productsTableName, values.id, {
              ...prev,
              ...values,
            });
          }

          await Replicache.del(tx, productsTableName, values.id);
        },
    },
  );
}
