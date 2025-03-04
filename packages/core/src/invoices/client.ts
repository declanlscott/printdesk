import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import { createInvoiceMutationArgsSchema, invoicesTableName } from "./shared";

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
}
