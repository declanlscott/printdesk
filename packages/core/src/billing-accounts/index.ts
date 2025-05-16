import { and, eq, getTableName, inArray, not, sql } from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { SharedErrors } from "../errors/shared";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
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

import type { InferInsertModel } from "drizzle-orm";
import type {
  BillingAccount,
  BillingAccountByOrigin,
  BillingAccountCustomerAuthorization,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountManagerAuthorization,
  BillingAccountsTable,
} from "./sql";

export namespace BillingAccounts {
  export const put = async (
    values: Array<InferInsertModel<BillingAccountsTable>>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(billingAccountsTable)
        .values(values)
        .onConflictDoUpdate({
          target: [
            billingAccountsTable.name,
            billingAccountsTable.papercutAccountId,
            billingAccountsTable.tenantId,
          ],
          set: {
            ...buildConflictUpdateColumns(billingAccountsTable, [
              "origin",
              "name",
              "papercutAccountId",
              "tenantId",
              "createdAt",
              "updatedAt",
              "deletedAt",
            ]),
            version: sql`${billingAccountsTable.version} + 1`,
          },
        })
        .returning(),
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

  export const byOrigin = async <
    TBillingAccountOrigin extends BillingAccount["origin"],
  >(
    origin: TBillingAccountOrigin,
  ) =>
    useTransaction(
      (tx) =>
        tx
          .select()
          .from(billingAccountsTable)
          .where(
            and(
              eq(billingAccountsTable.origin, origin),
              origin === "papercut"
                ? not(eq(billingAccountsTable.papercutAccountId, -1))
                : undefined,
              eq(billingAccountsTable.tenantId, useTenant().id),
            ),
          ) as unknown as Promise<
          Array<BillingAccountByOrigin<TBillingAccountOrigin>>
        >,
    );

  export const updateReviewThreshold = fn(
    updateBillingAccountReviewThresholdMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(
        [getTableName(billingAccountsTable), "update", id],
        {
          Error: SharedErrors.AccessDenied,
          args: [{ name: getTableName(billingAccountsTable), id }],
        },
      );

      return useTransaction(async (tx) => {
        const [adminsOps, managers, customers] = await Promise.all([
          Users.byRoles(["administrator", "operator"]),
          Users.withManagerAuthorization(id),
          Users.withCustomerAuthorization(id),
          tx
            .update(billingAccountsTable)
            .set(values)
            .where(
              and(
                eq(billingAccountsTable.id, id),
                eq(billingAccountsTable.tenantId, useTenant().id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          poke(
            ...adminsOps.map((u) => `/users/${u.id}` as const),
            ...managers.map(({ managerId }) => `/users/${managerId}` as const),
            ...customers.map(
              ({ customerId }) => `/users/${customerId}` as const,
            ),
          ),
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
          Error: SharedErrors.AccessDenied,
          args: [{ name: getTableName(billingAccountsTable), id }],
        },
      );

      return useTransaction(async (tx) => {
        const [adminsOps, managers, customers] = await Promise.all([
          Users.byRoles(["administrator", "operator"]),
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
          poke(
            ...adminsOps.map((u) => `/users/${u.id}` as const),
            ...managers.map(({ managerId }) => `/users/${managerId}` as const),
            ...customers.map(
              ({ customerId }) => `/users/${customerId}` as const,
            ),
          ),
        );
      });
    },
  );

  export const putCustomerAuthorizations = async (
    values: Array<InferInsertModel<BillingAccountCustomerAuthorizationsTable>>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(billingAccountCustomerAuthorizationsTable)
        .values(values)
        .onConflictDoUpdate({
          target: [
            billingAccountCustomerAuthorizationsTable.customerId,
            billingAccountCustomerAuthorizationsTable.billingAccountId,
            billingAccountCustomerAuthorizationsTable.tenantId,
          ],
          set: {
            ...buildConflictUpdateColumns(
              billingAccountCustomerAuthorizationsTable,
              [
                "customerId",
                "billingAccountId",
                "tenantId",
                "createdAt",
                "updatedAt",
                "deletedAt",
              ],
            ),
            version: sql`${billingAccountCustomerAuthorizationsTable.version} + 1`,
          },
        })
        .returning(),
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

  export const readCustomerAuthorizationsByOrigin = async <
    TBillingAccountOrigin extends BillingAccount["origin"],
  >(
    origin: TBillingAccountOrigin,
  ) =>
    useTransaction((tx) =>
      tx
        .select({
          customerAuthorization: billingAccountCustomerAuthorizationsTable,
        })
        .from(billingAccountCustomerAuthorizationsTable)
        .innerJoin(
          billingAccountsTable,
          and(
            eq(
              billingAccountsTable.id,
              billingAccountCustomerAuthorizationsTable.billingAccountId,
            ),
            eq(
              billingAccountsTable.tenantId,
              billingAccountCustomerAuthorizationsTable.tenantId,
            ),
          ),
        )
        .where(
          and(
            eq(billingAccountsTable.origin, origin),
            origin === "papercut"
              ? not(eq(billingAccountsTable.papercutAccountId, -1))
              : undefined,
            eq(
              billingAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        )
        .then(R.map(R.prop("customerAuthorization"))),
    );

  export const createManagerAuthorization = fn(
    createBillingAccountManagerAuthorizationMutationArgsSchema,
    async (values) => {
      await AccessControl.enforce(
        [getTableName(billingAccountManagerAuthorizationsTable), "create"],
        {
          Error: SharedErrors.AccessDenied,
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

        await afterTransaction(() => poke("/tenant"));
      });
    },
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

  export const deleteManagerAuthorization = fn(
    deleteBillingAccountManagerAuthorizationMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(
        [getTableName(billingAccountManagerAuthorizationsTable), "delete"],
        {
          Error: SharedErrors.AccessDenied,
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
              eq(
                billingAccountManagerAuthorizationsTable.tenantId,
                useTenant().id,
              ),
            ),
          );

        await afterTransaction(() => poke("/tenant"));
      });
    },
  );
}
