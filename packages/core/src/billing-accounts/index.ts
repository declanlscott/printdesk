import { and, eq, getTableName, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountMutationArgsSchema,
  updateBillingAccountReviewThresholdMutationArgsSchema,
} from "./shared";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "./sql";

import type {
  BillingAccount,
  BillingAccountCustomerAuthorization,
  BillingAccountManagerAuthorization,
} from "./sql";

export namespace BillingAccounts {
  export const createManagerAuthorization = fn(
    createBillingAccountManagerAuthorizationMutationArgsSchema,
    async (values) => {
      await AccessControl.enforce(
        [getTableName(billingAccountManagerAuthorizationsTable), "create"],
        {
          Error: ApplicationError.AccessDenied,
          args: [
            { name: getTableName(billingAccountManagerAuthorizationsTable) },
          ],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .insert(billingAccountManagerAuthorizationsTable)
          .values(values)
          .onConflictDoNothing();

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const read = async (ids: Array<BillingAccount["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(billingAccountsTable)
        .where(
          and(
            inArray(billingAccountsTable.id, ids),
            eq(billingAccountsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const readCustomerAuthorizations = async (
    ids: Array<BillingAccountCustomerAuthorization["id"]>,
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(billingAccountCustomerAuthorizationsTable)
        .where(
          and(
            inArray(billingAccountCustomerAuthorizationsTable.id, ids),
            eq(
              billingAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const readManagerAuthorizations = async (
    ids: Array<BillingAccountManagerAuthorization["id"]>,
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(billingAccountManagerAuthorizationsTable)
        .where(
          and(
            inArray(billingAccountManagerAuthorizationsTable.id, ids),
            eq(
              billingAccountManagerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const updateReviewThreshold = fn(
    updateBillingAccountReviewThresholdMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(
        [getTableName(billingAccountsTable), "update", id],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: getTableName(billingAccountsTable), id }],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .update(billingAccountsTable)
          .set(values)
          .where(
            and(
              eq(billingAccountsTable.id, id),
              eq(billingAccountsTable.tenantId, useTenant().id),
            ),
          );

        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          Users.withManagerAuthorization(id),
          Users.withCustomerAuthorization(id),
        ]);

        await afterTransaction(() =>
          poke([
            ...adminsOps.map((u) => `/users/${u.id}` as const),
            ...managers.map(({ managerId }) => `/users/${managerId}` as const),
            ...customers.map(
              ({ customerId }) => `/users/${customerId}` as const,
            ),
          ]),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteBillingAccountMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce(
        [getTableName(billingAccountsTable), "delete"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: getTableName(billingAccountsTable), id }],
        },
      );

      return useTransaction(async (tx) => {
        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          tx
            .select({
              managerId: billingAccountManagerAuthorizationsTable.managerId,
            })
            .from(billingAccountManagerAuthorizationsTable)
            .where(
              and(
                eq(
                  billingAccountManagerAuthorizationsTable.billingAccountId,
                  id,
                ),
                eq(
                  billingAccountManagerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .select({
              customerId: billingAccountCustomerAuthorizationsTable.customerId,
            })
            .from(billingAccountCustomerAuthorizationsTable)
            .where(
              and(
                eq(
                  billingAccountCustomerAuthorizationsTable.billingAccountId,
                  id,
                ),
                eq(
                  billingAccountCustomerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .update(billingAccountsTable)
            .set(values)
            .where(
              and(
                eq(billingAccountsTable.id, id),
                eq(billingAccountsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          poke([
            ...adminsOps.map((u) => `/users/${u.id}` as const),
            ...managers.map(({ managerId }) => `/users/${managerId}` as const),
            ...customers.map(
              ({ customerId }) => `/users/${customerId}` as const,
            ),
          ]),
        );
      });
    },
  );

  export const deleteManagerAuthorization = fn(
    deleteBillingAccountManagerAuthorizationMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce(
        [getTableName(billingAccountManagerAuthorizationsTable), "delete"],
        {
          Error: ApplicationError.AccessDenied,
          args: [
            {
              name: getTableName(billingAccountManagerAuthorizationsTable),
              id,
            },
          ],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .update(billingAccountManagerAuthorizationsTable)
          .set(values)
          .where(
            and(
              eq(billingAccountManagerAuthorizationsTable.id, id),
              eq(billingAccountManagerAuthorizationsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );
}
