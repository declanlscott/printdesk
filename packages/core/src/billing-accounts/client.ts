import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
  createBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountMutationArgsSchema,
  updateBillingAccountReviewThresholdMutationArgsSchema,
} from "./shared";

export namespace BillingAccounts {
  export const createManagerAuthorization = Replicache.mutator(
    createBillingAccountManagerAuthorizationMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce(
        [tx, user, billingAccountManagerAuthorizationsTableName, "create"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: billingAccountManagerAuthorizationsTableName }],
        },
      ),
    () => async (tx, values) =>
      Replicache.set(
        tx,
        billingAccountManagerAuthorizationsTableName,
        values.id,
        values,
      ),
  );

  export const updateReviewThreshold = Replicache.mutator(
    updateBillingAccountReviewThresholdMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce(
        [tx, user, billingAccountsTableName, "update", id],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: billingAccountsTableName, id }],
        },
      ),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await Replicache.get(tx, billingAccountsTableName, id);

        return Replicache.set(tx, billingAccountsTableName, id, {
          ...prev,
          ...values,
        });
      },
  );

  export const delete_ = Replicache.mutator(
    deleteBillingAccountMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, billingAccountsTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: billingAccountsTableName, id }],
      }),
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
  );

  export const deleteManagerAuthorization = Replicache.mutator(
    deleteBillingAccountManagerAuthorizationMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce(
        [tx, user, billingAccountManagerAuthorizationsTableName, "delete"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: billingAccountManagerAuthorizationsTableName, id }],
        },
      ),
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
            {
              ...prev,
              ...values,
            },
          );
        }

        await Replicache.del(
          tx,
          billingAccountManagerAuthorizationsTableName,
          id,
        );
      },
  );
}
