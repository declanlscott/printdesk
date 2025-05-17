import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { createInvoiceMutationArgsSchema, invoicesTableName } from "./shared";

import type { Invoice } from "./sql";

export namespace Invoices {
  export const create = Replicache.createMutator(
    createInvoiceMutationArgsSchema,
    {
      authorizer: async (tx, user) =>
        AccessControl.enforce(tx, user, invoicesTableName, "create"),
      getMutator: () => async (tx, values) =>
        Replicache.set(tx, invoicesTableName, values.id, values),
    },
  );

  export const all = Replicache.createQuery({
    getQuery: () => async (tx) => Replicache.scan(tx, invoicesTableName),
  });

  export const byId = Replicache.createQuery({
    getDeps: (id: Invoice["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, invoicesTableName, id),
  });
}
