import * as R from "remeda";

import { AccessControl } from "../access-control/client";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
} from "../billing-accounts/shared";
import { ordersTableName } from "../orders/shared";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  deleteUserMutationArgsSchema,
  restoreUserMutationArgsSchema,
  updateUserRoleMutationArgsSchema,
  usersTableName,
} from "./shared";

import type { BillingAccount } from "../billing-accounts/sql";
import type { Order } from "../orders/sql";
import type { UserRole } from "./shared";
import type { User } from "./sql";

export namespace Users {
  export const all = Replicache.query(
    () => ({}),
    () => async (tx) => Replicache.scan(tx, usersTableName),
  );

  export const byId = Replicache.query(
    (id: User["id"]) => ({ id }),
    ({ id }) =>
      async (tx) =>
        Replicache.get(tx, usersTableName, id),
  );

  export const byRoles = Replicache.query(
    (
      roles: Array<UserRole> = [
        "administrator",
        "operator",
        "manager",
        "customer",
      ],
    ) => ({ roles }),
    ({ roles }) =>
      async (tx) =>
        Replicache.scan(tx, usersTableName).then(
          R.filter((user) => roles.includes(user.role)),
        ),
  );

  export const withOrderAccess = Replicache.query(
    (orderId: Order["id"]) => ({ orderId }),
    ({ orderId }) =>
      async (tx) => {
        const order = await Replicache.get(tx, ordersTableName, orderId);

        const [adminsOps, managers, customer] = await Promise.all([
          byRoles(["administrator", "operator"])(tx),
          withManagerAuthorization(order.billingAccountId)(tx),
          byId(order.customerId)(tx),
        ]);

        return R.uniqueBy(
          [...adminsOps, ...managers, customer].filter(Boolean),
          R.prop("id"),
        );
      },
  );

  export const withManagerAuthorization = Replicache.query(
    (accountId: BillingAccount["id"]) => ({ accountId }),
    ({ accountId }) =>
      async (tx) =>
        R.pipe(
          await Replicache.scan(
            tx,
            billingAccountManagerAuthorizationsTableName,
          ),
          R.filter(({ billingAccountId }) => billingAccountId === accountId),
          async (authorizations) =>
            Promise.all(
              authorizations.map(({ managerId }) =>
                Replicache.get(tx, usersTableName, managerId),
              ),
            ).then((users) => users.filter(Boolean)),
        ),
  );

  export const withCustomerAuthorization = Replicache.query(
    (accountId: BillingAccount["id"]) => ({ accountId }),
    ({ accountId }) =>
      async (tx) =>
        R.pipe(
          await Replicache.scan(
            tx,
            billingAccountCustomerAuthorizationsTableName,
          ),
          R.filter(({ billingAccountId }) => billingAccountId === accountId),
          async (authorizations) =>
            Promise.all(
              authorizations.map(({ customerId }) =>
                Replicache.get(tx, usersTableName, customerId),
              ),
            ).then((users) => users.filter(Boolean)),
        ),
  );

  export const updateRole = Replicache.mutator(
    updateUserRoleMutationArgsSchema,
    (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await Replicache.get(tx, usersTableName, id);

        return Replicache.set(tx, usersTableName, id, {
          ...prev,
          ...values,
        });
      },
  );

  export const delete_ = Replicache.mutator(
    deleteUserMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        // Soft delete for administrators
        if (user.role === "administrator") {
          const prev = await Replicache.get(tx, usersTableName, id);

          return Replicache.set(tx, usersTableName, id, {
            ...prev,
            ...values,
            role: "customer",
          });
        }

        await Replicache.del(tx, usersTableName, id);
      },
  );

  export const restore = Replicache.mutator(
    restoreUserMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, usersTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTableName, id }],
      }),
    () =>
      async (tx, { id }) => {
        const prev = await Replicache.get(tx, usersTableName, id);

        return Replicache.set(tx, usersTableName, id, {
          ...prev,
          deletedAt: null,
        });
      },
  );
}
