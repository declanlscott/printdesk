import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import { tenantsTableName, updateTenantMutationArgsSchema } from "./shared";

import type { Tenant } from "./sql";

export namespace Tenants {
  export const get = Replicache.query(
    (id: Tenant["id"]) => ({ id }),
    ({ id }) =>
      async (tx) =>
        Replicache.get(tx, tenantsTableName, id),
  );

  export const update = Replicache.mutator(
    updateTenantMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, tenantsTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: tenantsTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await Replicache.get(tx, tenantsTableName, id);

        return Replicache.set(tx, tenantsTableName, id, {
          ...prev,
          ...values,
        });
      },
  );
}
