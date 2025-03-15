import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
  createBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountMutationArgsSchema,
  updateBillingAccountReviewThresholdMutationArgsSchema,
} from "./shared";

import type { BillingAccount } from "./sql";

export namespace BillingAccounts {
  export const all = Replicache.createQuery({
    getQuery: () => async (tx) => Replicache.scan(tx, billingAccountsTableName),
  });

  export const byId = Replicache.createQuery({
    getDeps: (id: BillingAccount["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, billingAccountsTableName, id),
  });

  export const allCustomerAuthorizations = Replicache.createQuery({
    getQuery: () => async (tx) =>
      Replicache.scan(tx, billingAccountCustomerAuthorizationsTableName),
  });

  export const allManagerAuthorizations = Replicache.createQuery({
    getQuery: () => async (tx) =>
      Replicache.scan(tx, billingAccountManagerAuthorizationsTableName),
  });

  export const createManagerAuthorization = Replicache.createMutator(
    createBillingAccountManagerAuthorizationMutationArgsSchema,
    {
      authorizer: async (tx, user) =>
        AccessControl.enforce(
          [tx, user, billingAccountManagerAuthorizationsTableName, "create"],
          {
            Error: ApplicationError.AccessDenied,
            args: [{ name: billingAccountManagerAuthorizationsTableName }],
          },
        ),
      getMutator: () => async (tx, values) =>
        Replicache.set(
          tx,
          billingAccountManagerAuthorizationsTableName,
          values.id,
          values,
        ),
    },
  );

  export const updateReviewThreshold = Replicache.createMutator(
    updateBillingAccountReviewThresholdMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce(
          [tx, user, billingAccountsTableName, "update", id],
          {
            Error: ApplicationError.AccessDenied,
            args: [{ name: billingAccountsTableName, id }],
          },
        ),
      getMutator:
        () =>
        async (tx, { id, ...values }) => {
          const prev = await Replicache.get(tx, billingAccountsTableName, id);

          return Replicache.set(tx, billingAccountsTableName, id, {
            ...prev,
            ...values,
          });
        },
    },
  );

  export const delete_ = Replicache.createMutator(
    deleteBillingAccountMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, billingAccountsTableName, "delete"], {
          Error: ApplicationError.AccessDenied,
          args: [{ name: billingAccountsTableName, id }],
        }),
      getMutator:
        ({ user }) =>
        async (tx, { id, ...values }) => {
          if (user.role === "administrator") {
            const prev = await Replicache.get(tx, billingAccountsTableName, id);

            return Replicache.set(tx, billingAccountsTableName, id, {
              ...prev,
              ...values,
            });
          }

          await Replicache.del(tx, billingAccountsTableName, id);
        },
    },
  );

  export const deleteManagerAuthorization = Replicache.createMutator(
    deleteBillingAccountManagerAuthorizationMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce(
          [tx, user, billingAccountManagerAuthorizationsTableName, "delete"],
          {
            Error: ApplicationError.AccessDenied,
            args: [{ name: billingAccountManagerAuthorizationsTableName, id }],
          },
        ),
      getMutator:
        ({ user }) =>
        async (tx, { id, ...values }) => {
          if (user.role === "administrator") {
            const prev = await Replicache.get(
              tx,
              billingAccountManagerAuthorizationsTableName,
              id,
            );

            return Replicache.set(
              tx,
              billingAccountManagerAuthorizationsTableName,
              id,
              { ...prev, ...values },
            );
          }

          await Replicache.del(
            tx,
            billingAccountManagerAuthorizationsTableName,
            id,
          );
        },
    },
  );
}
