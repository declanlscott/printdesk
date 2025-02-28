import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  createProductMutationArgsSchema,
  deleteProductMutationArgsSchema,
  productsTableName,
  updateProductMutationArgsSchema,
} from "./shared";

export namespace Products {
  export const create = Replicache.optimisticMutator(
    createProductMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, productsTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTableName }],
      }),
    () => async (tx, values) =>
      Replicache.set(tx, productsTableName, values.id, values),
  );

  export const update = Replicache.optimisticMutator(
    updateProductMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, productsTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await Replicache.get(tx, productsTableName, id);

        return Replicache.set(tx, productsTableName, id, {
          ...prev,
          ...values,
        });
      },
  );

  export const delete_ = Replicache.optimisticMutator(
    deleteProductMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, productsTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: productsTableName, id }],
      }),
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
  );
}
