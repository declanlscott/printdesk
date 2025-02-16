import * as R from "remeda";

import { BillingAccounts } from "../billing-accounts";
import { useTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
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

    return useTransaction(async () => {
      const prev = await BillingAccounts.fromPapercut();

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

      const values = [...puts, ...dels];
      if (R.isEmpty(values)) return [];

      return BillingAccounts.put(values);
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

    await useTransaction(async () => {
      const deletedAt = new Date();

      const prevUsernames = await Users.fromPapercut().then(
        R.map(R.prop("username")),
      );

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

      const userValues = [...userPuts, ...userDels];
      const users = R.isEmpty(userValues) ? [] : await Users.put(userValues);

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

      const billingAccountCustomerAuthorizationValues = [
        ...customerAuthPuts,
        ...customerAuthDels,
      ];
      if (!R.isEmpty(billingAccountCustomerAuthorizationValues))
        await BillingAccounts.putCustomerAuthorizations(
          billingAccountCustomerAuthorizationValues,
        );
    });
  }
}
