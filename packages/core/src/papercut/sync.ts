import { and, eq, isNotNull } from "drizzle-orm";
import * as R from "remeda";

import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountsTable,
} from "../billing-accounts/sql";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { useTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { usersTable } from "../users/sql";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";
import { PapercutRpc } from "./rpc";

import type { InferInsertModel } from "drizzle-orm";
import type {
  BillingAccount,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountsTable,
} from "../billing-accounts/sql";
import type { User, UsersTable } from "../users/sql";

export namespace PapercutSync {
  export async function billingAccounts() {
    const tenant = useTenant();

    const next = new Map<
      NonNullable<BillingAccount["papercutAccountId"]>,
      { name: BillingAccount["name"] }
    >();

    const names = await PapercutRpc.listSharedAccounts();

    // NOTE: Batch api requests to avoid overloading the papercut server
    for (const batch of R.chunk(
      names,
      Constants.PAPERCUT_API_REQUEST_BATCH_SIZE,
    ))
      await Promise.all(
        batch.map(async (name) => {
          const [accountId] = await PapercutRpc.getSharedAccountProperties(
            name,
            "account-id",
          );
          if (accountId === undefined)
            throw new Error(`Missing account-id for ${name}`);

          next.set(accountId, { name });
        }),
      );

    return useTransaction(async (tx) => {
      const prev = await tx
        .select({
          papercutAccountId: billingAccountsTable.papercutAccountId,
          name: billingAccountsTable.name,
        })
        .from(billingAccountsTable)
        .where(
          and(
            eq(billingAccountsTable.type, "papercut"),
            isNotNull(billingAccountsTable.papercutAccountId),
            eq(billingAccountsTable.tenantId, tenant.id),
          ),
        )
        .then(
          R.map((account) => ({
            papercutAccountId: account.papercutAccountId!,
            name: account.name,
          })),
        );

      type Values = Array<InferInsertModel<BillingAccountsTable>>;
      const puts: Values = [];
      const dels: Values = [];

      for (const [papercutAccountId, { name }] of next)
        puts.push({
          papercutAccountId,
          name,
          type: "papercut" as const,
          tenantId: tenant.id,
          deletedAt: null,
        });

      const deletedAt = new Date();
      for (const { papercutAccountId, name } of prev)
        if (!next.has(papercutAccountId))
          dels.push({
            papercutAccountId,
            name,
            type: "papercut" as const,
            tenantId: tenant.id,
            deletedAt,
          });

      return tx
        .insert(billingAccountsTable)
        .values([...puts, ...dels])
        .onConflictDoUpdate({
          target: [
            billingAccountsTable.name,
            billingAccountsTable.papercutAccountId,
            billingAccountsTable.tenantId,
          ],
          set: buildConflictUpdateColumns(billingAccountsTable, [
            "papercutAccountId",
            "name",
            "type",
            "tenantId",
            "deletedAt",
          ]),
        })
        .returning();
    });
  }

  export async function users() {
    const tenant = useTenant();

    const taskStatus = await PapercutRpc.getTaskStatus();
    if (!taskStatus.completed)
      throw new HttpError.ServiceUnavailable(
        "PaperCut is syncing with its upstream user directory, please try again later.",
      );

    const papercutBillingAccounts = new Map(
      await PapercutSync.billingAccounts().then(
        R.map((account) => [account.name, account] as const),
      ),
    );

    const nextUsernames = new Set(await PapercutRpc.listUserAccounts());

    const userSharedAccountNames = new Map<
      User["username"],
      Array<BillingAccount["name"]>
    >();
    // NOTE: Batch api requests to avoid overloading the papercut server
    for (const batch of R.chunk(
      Array.from(nextUsernames),
      Constants.PAPERCUT_API_REQUEST_BATCH_SIZE,
    ))
      await Promise.all(
        batch.map(async (username) =>
          userSharedAccountNames.set(
            username,
            await PapercutRpc.listUserSharedAccounts(username, true),
          ),
        ),
      );

    await useTransaction(async (tx) => {
      const deletedAt = new Date();

      const prevUsernames = await tx
        .select({ username: usersTable.username })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.type, "papercut"),
            eq(usersTable.tenantId, tenant.id),
          ),
        )
        .then(R.map(R.prop("username")));

      type UserValues = Array<InferInsertModel<UsersTable>>;
      const userPuts: UserValues = [];
      const userDels: UserValues = [];

      for (const username of nextUsernames)
        userPuts.push({
          type: "papercut" as const,
          username,
          tenantId: tenant.id,
          deletedAt: null,
        });

      for (const username of prevUsernames)
        if (!nextUsernames.has(username))
          userDels.push({
            type: "papercut" as const,
            username,
            tenantId: tenant.id,
            deletedAt,
          });

      const users = await tx
        .insert(usersTable)
        .values([...userPuts, ...userDels])
        .onConflictDoUpdate({
          target: [usersTable.type, usersTable.username, usersTable.tenantId],
          set: buildConflictUpdateColumns(usersTable, [
            "type",
            "username",
            "tenantId",
            "deletedAt",
          ]),
        })
        .returning({
          id: usersTable.id,
          username: usersTable.username,
          deletedAt: usersTable.deletedAt,
        });

      type BillingAccountCustomerAuthorizationValues = Array<
        InferInsertModel<BillingAccountCustomerAuthorizationsTable>
      >;
      const customerAuthPuts: BillingAccountCustomerAuthorizationValues = [];
      const customerAuthDels: BillingAccountCustomerAuthorizationValues = [];

      for (const user of users) {
        if (!user.deletedAt) {
          for (const name of userSharedAccountNames.get(user.username)!)
            customerAuthPuts.push({
              customerId: user.id,
              billingAccountId: papercutBillingAccounts.get(name)!.id,
              tenantId: tenant.id,
              deletedAt: null,
            });

          continue;
        }

        for (const name of userSharedAccountNames.get(user.username)!)
          customerAuthDels.push({
            customerId: user.id,
            billingAccountId: papercutBillingAccounts.get(name)!.id,
            tenantId: tenant.id,
            deletedAt,
          });
      }

      await tx
        .insert(billingAccountCustomerAuthorizationsTable)
        .values([...customerAuthPuts, ...customerAuthDels])
        .onConflictDoUpdate({
          target: [
            billingAccountCustomerAuthorizationsTable.customerId,
            billingAccountCustomerAuthorizationsTable.billingAccountId,
            billingAccountCustomerAuthorizationsTable.tenantId,
          ],
          set: buildConflictUpdateColumns(
            billingAccountCustomerAuthorizationsTable,
            ["customerId", "billingAccountId", "tenantId", "deletedAt"],
          ),
        });
    });
  }
}
