import { and, eq, getTableName, inArray } from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { oauth2ProvidersTable } from "../auth/sql";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "../billing-accounts/sql";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { ordersTable } from "../orders/sql";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
} from "./shared";
import { userProfilesTable, usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Order } from "../orders/sql";
import type { UserRole } from "./shared";
import type { User, UserData, UserProfilesTable } from "./sql";

export namespace Users {
  export const createProfile = async (
    profile: InferInsertModel<UserProfilesTable>,
  ) =>
    useTransaction(async (tx) =>
      tx
        .insert(userProfilesTable)
        .values(profile)
        .returning({ id: userProfilesTable.id })
        .then(R.first()),
    );

  export const read = async (
    ids: Array<User["id"]>,
  ): Promise<Array<UserData>> =>
    useTransaction((tx) =>
      tx
        .select({
          user: usersTable,
          profile: userProfilesTable,
          oauth2Provider: oauth2ProvidersTable,
        })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .innerJoin(
          oauth2ProvidersTable,
          and(
            eq(userProfilesTable.oauth2ProviderId, oauth2ProvidersTable.id),
            eq(userProfilesTable.tenantId, oauth2ProvidersTable.tenantId),
          ),
        )
        .where(
          and(
            inArray(usersTable.id, ids),
            eq(usersTable.tenantId, useTenant().id),
          ),
        )
        .then((rows) =>
          rows.map(({ user, profile, oauth2Provider }) => ({
            ...user,
            profile,
            oauth2Provider,
          })),
        ),
    );

  export const fromRoles = async (
    roles: Array<UserRole> = [
      "administrator",
      "operator",
      "manager",
      "customer",
    ],
  ) =>
    useTransaction((tx) =>
      tx
        .select({ id: usersTable.id, role: userProfilesTable.role })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(
            inArray(userProfilesTable.role, roles),
            eq(usersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export async function withOrderAccess(orderId: Order["id"]) {
    const tenant = useTenant();

    return useTransaction(async (tx) => {
      const [adminsOps, managers, [customer]] = await Promise.all([
        fromRoles(["administrator", "operator"]),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            userProfilesTable,
            and(
              eq(usersTable.id, userProfilesTable.userId),
              eq(usersTable.tenantId, userProfilesTable.tenantId),
            ),
          )
          .innerJoin(
            billingAccountManagerAuthorizationsTable,
            and(
              eq(
                usersTable.id,
                billingAccountManagerAuthorizationsTable.managerId,
              ),
              eq(
                usersTable.tenantId,
                billingAccountManagerAuthorizationsTable.tenantId,
              ),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(
                billingAccountManagerAuthorizationsTable.billingAccountId,
                ordersTable.billingAccountId,
              ),
              eq(billingAccountsTable.tenantId, tenant.id),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            userProfilesTable,
            and(
              eq(usersTable.id, userProfilesTable.userId),
              eq(usersTable.tenantId, userProfilesTable.tenantId),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(usersTable.id, ordersTable.customerId),
              eq(usersTable.tenantId, ordersTable.tenantId),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
      ]);

      return R.uniqueBy([...adminsOps, ...managers, customer], R.prop("id"));
    });
  }

  export const withManagerAuthorization = async (
    accountId: BillingAccount["id"],
  ) =>
    useTransaction(async (tx) =>
      tx
        .select({
          managerId: billingAccountManagerAuthorizationsTable.managerId,
        })
        .from(billingAccountManagerAuthorizationsTable)
        .where(
          and(
            eq(
              billingAccountManagerAuthorizationsTable.billingAccountId,
              accountId,
            ),
            eq(
              billingAccountManagerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const withCustomerAuthorization = async (
    accountId: BillingAccount["id"],
  ) =>
    useTransaction((tx) =>
      tx
        .select({
          customerId: billingAccountCustomerAuthorizationsTable.customerId,
        })
        .from(billingAccountCustomerAuthorizationsTable)
        .where(
          and(
            eq(
              billingAccountCustomerAuthorizationsTable.billingAccountId,
              accountId,
            ),
            eq(
              billingAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const exists = async (userId: User["id"]) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, userId),
            eq(usersTable.tenantId, useTenant().id),
          ),
        )
        .then((rows) => rows.length > 0),
    );

  export const updateProfileRole = fn(
    updateUserProfileRoleMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([getTableName(usersTable), "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(usersTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(userProfilesTable)
          .set(values)
          .where(
            and(
              eq(userProfilesTable.id, id),
              eq(userProfilesTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const deleteProfile = fn(
    deleteUserProfileMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([getTableName(usersTable), "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(usersTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set(values)
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const restoreProfile = fn(
    restoreUserProfileMutationArgsSchema,
    async ({ id }) => {
      const tenant = useTenant();

      await AccessControl.enforce([getTableName(usersTable), "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(usersTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ deletedAt: null })
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );
}
