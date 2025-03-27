import { AccessControl } from "../access-control/client";
import { SharedErrors } from "../errors/shared";
import { Replicache } from "../replicache/client";
import { tenantsTableName, updateTenantMutationArgsSchema } from "./shared";

import type { Tenant } from "./sql";

export namespace Tenants {
  export const get = Replicache.createQuery({
    getDeps: (id: Tenant["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, tenantsTableName, id),
  });

  export const update = Replicache.createMutator(
    updateTenantMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, tenantsTableName, "update"], {
          Error: SharedErrors.AccessDenied,
          args: [{ name: tenantsTableName, id }],
        }),
      getMutator:
        () =>
        async (tx, { id, ...values }) => {
          const prev = await Replicache.get(tx, tenantsTableName, id);

          return Replicache.set(tx, tenantsTableName, id, {
            ...prev,
            ...values,
          });
        },
    },
  );
}
