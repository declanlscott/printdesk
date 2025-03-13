import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  ordersTableName,
  updateOrderMutationArgsSchema,
} from "./shared";

import type { Order } from "./sql";

export namespace Orders {
  export const create = Replicache.mutator(
    createOrderMutationArgsSchema,
    (tx, user, { billingAccountId }) =>
      AccessControl.enforce(
        [tx, user, ordersTableName, "create", billingAccountId],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: ordersTableName }],
        },
      ),
    () => async (tx, values) =>
      Replicache.set(tx, ordersTableName, values.id, values),
  );

  export const all = Replicache.query(
    () => ({}),
    () => async (tx) => Replicache.scan(tx, ordersTableName),
  );

  export const byId = Replicache.query(
    (id: Order["id"]) => ({ id }),
    ({ id }) =>
      async (tx) =>
        Replicache.get(tx, ordersTableName, id),
  );

  export const update = Replicache.mutator(
    updateOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await Replicache.get(tx, ordersTableName, values.id);

      return Replicache.set(tx, ordersTableName, values.id, {
        ...prev,
        ...values,
      });
    },
  );

  export const delete_ = Replicache.mutator(
    deleteOrderMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, ordersTableName, "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        if (user.role === "administrator") {
          const prev = await Replicache.get(tx, ordersTableName, id);

          return Replicache.set(tx, ordersTableName, id, {
            ...prev,
            ...values,
          });
        }

        await Replicache.del(tx, ordersTableName, id);
      },
  );
}
