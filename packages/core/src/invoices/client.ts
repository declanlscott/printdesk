import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import { createInvoiceMutationArgsSchema, invoicesTableName } from "./shared";

import type { Invoice } from "./sql";

export namespace Invoices {
  export const create = Replicache.mutator(
    createInvoiceMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, invoicesTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: invoicesTableName }],
      }),
    () => async (tx, values) =>
      Replicache.set(tx, invoicesTableName, values.id, values),
  );

  export const all = Replicache.query(
    () => ({}),
    () => async (tx) => Replicache.scan(tx, invoicesTableName),
  );

  export const byId = Replicache.query(
    (id: Invoice["id"]) => ({ id }),
    ({ id }) =>
      async (tx) =>
        Replicache.get(tx, invoicesTableName, id),
  );
}
