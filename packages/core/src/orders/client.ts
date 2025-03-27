import { AccessControl } from "../access-control/client";
import { SharedErrors } from "../errors/shared";
import { Replicache } from "../replicache/client";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  ordersTableName,
  updateOrderMutationArgsSchema,
} from "./shared";

import type { Order } from "./sql";

export namespace Orders {
  export const create = Replicache.createMutator(
    createOrderMutationArgsSchema,
    {
      authorizer: (tx, user, { billingAccountId }) =>
        AccessControl.enforce(
          [tx, user, ordersTableName, "create", billingAccountId],
          {
            Error: SharedErrors.AccessDenied,
            args: [{ name: ordersTableName }],
          },
        ),
      getMutator: () => async (tx, values) =>
        Replicache.set(tx, ordersTableName, values.id, values),
    },
  );

  export const all = Replicache.createQuery({
    getQuery: () => async (tx) => Replicache.scan(tx, ordersTableName),
  });

  export const byId = Replicache.createQuery({
    getDeps: (id: Order["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, ordersTableName, id),
  });

  export const update = Replicache.createMutator(
    updateOrderMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, ordersTableName, "update", id], {
          Error: SharedErrors.AccessDenied,
          args: [{ name: ordersTableName, id }],
        }),
      getMutator: () => async (tx, values) => {
        const prev = await Replicache.get(tx, ordersTableName, values.id);

        return Replicache.set(tx, ordersTableName, values.id, {
          ...prev,
          ...values,
        });
      },
    },
  );

  export const delete_ = Replicache.createMutator(
    deleteOrderMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, ordersTableName, "delete", id], {
          Error: SharedErrors.AccessDenied,
          args: [{ name: ordersTableName, id }],
        }),
      getMutator:
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
    },
  );
}
