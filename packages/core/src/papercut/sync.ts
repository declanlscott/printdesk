import * as R from "remeda";

import { Papercut } from ".";
import { Auth } from "../auth";
import { EntraId } from "../auth/entra-id";
import { BillingAccounts } from "../billing-accounts";
import { useTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { ApplicationError, HttpError } from "../utils/errors";
import { Graph, withGraph } from "../utils/graph";

import type { User as GraphUser } from "@microsoft/microsoft-graph-types";
import type { InferInsertModel } from "drizzle-orm";
import type {
  BillingAccount,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountsTable,
} from "../billing-accounts/sql";
import type { User, UsersTable } from "../users/sql";
import type { NonNullableProperties } from "../utils/types";

export namespace Sync {
  export async function billingAccounts() {
    const tenant = useTenant();

    const next = new Map<
      NonNullable<BillingAccount["papercutAccountId"]>,
      { name: BillingAccount["name"] }
    >();

    const names = await Papercut.listSharedAccounts();

    // NOTE: Batch api requests to avoid overloading the customer's papercut server
    for (const batch of R.chunk(
      names,
      Constants.PAPERCUT_API_REQUEST_BATCH_SIZE,
    ))
      await Promise.all(
        batch.map(async (name) => {
          const [accountId] = await Papercut.getSharedAccountProperties(
            name,
            "account-id",
          );
          if (accountId === undefined)
            throw new Error(`Missing account-id for ${name}`);

          next.set(accountId, { name });
        }),
      );

    return useTransaction(async () => {
      const prev = await BillingAccounts.byType("papercut");

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

  export async function billingAccountCustomerAuthorizations() {
    const deletedAt = new Date();

    const [users, billingAccountsMap] = await useTransaction(() =>
      Promise.all([
        Users.byType("papercut"),
        BillingAccounts.byType("papercut").then(
          (accounts) =>
            new Map(accounts.map((account) => [account.name, account])),
        ),
      ]),
    );

    const userAccountsMap = new Map<
      User["id"],
      Array<BillingAccount["name"]>
    >();
    // NOTE: Batch api requests to avoid overloading the customer's papercut server
    for (const batch of R.chunk(
      users,
      Constants.PAPERCUT_API_REQUEST_BATCH_SIZE,
    ))
      await Promise.all(
        batch.map(async (user) =>
          userAccountsMap.set(
            user.id,
            await Papercut.listUserSharedAccounts(user.username, true),
          ),
        ),
      );

    type BillingAccountCustomerAuthorizationValues = Array<
      InferInsertModel<BillingAccountCustomerAuthorizationsTable>
    >;
    const puts: BillingAccountCustomerAuthorizationValues = [];
    const dels: BillingAccountCustomerAuthorizationValues = [];

    for (const user of users) {
      const accountNames = userAccountsMap.get(user.username) ?? [];

      if (!user.deletedAt) {
        for (const accountName of accountNames)
          puts.push({
            customerId: user.id,
            billingAccountId: billingAccountsMap.get(accountName)!.id,
            tenantId: useTenant().id,
            deletedAt: null,
          });

        continue;
      }

      for (const accountName of accountNames) {
        dels.push({
          customerId: user.id,
          billingAccountId: billingAccountsMap.get(accountName)!.id,
          tenantId: useTenant().id,
          deletedAt,
        });
      }
    }

    const values = [...puts, ...dels];

    if (R.pipe(values, R.isNot(R.isEmpty)))
      await BillingAccounts.putCustomerAuthorizations(values);
  }

  export async function users() {
    const taskStatus = await Papercut.getTaskStatus();
    if (!taskStatus.completed)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.ServiceUnavailable(),
          text: "",
        },
        message: "papercut task status not yet completed",
      });

    const papercutUsernames = new Set(await Papercut.listUserAccounts());

    const oauth2Providers = await Auth.readOauth2Providers();

    const users: Array<User> = [];
    for (const oauth2Provider of oauth2Providers)
      switch (oauth2Provider.type) {
        case Constants.ENTRA_ID:
          await withGraph(
            Graph.Client.initWithMiddleware({
              authProvider: {
                getAccessToken: async () =>
                  EntraId.applicationAccessToken(oauth2Provider.id),
              },
            }),
            async () => {
              const deletedAt = new Date();

              const prevUsers = await Users.byType("papercut").then(
                (users) => new Map(users.map((user) => [user.username, user])),
              );

              const entraUsers = await Graph.users().then(
                (users) =>
                  new Map(
                    (() => {
                      const values: Array<
                        [
                          NonNullable<GraphUser["userPrincipalName"]>,
                          NonNullableProperties<
                            Required<
                              Pick<GraphUser, "id" | "displayName" | "mail">
                            >
                          >,
                        ]
                      > = [];

                      for (const user of users)
                        if (
                          user.userPrincipalName &&
                          user.id &&
                          user.mail &&
                          user.displayName
                        )
                          values.push([
                            user.userPrincipalName,
                            {
                              id: user.id,
                              displayName: user.displayName,
                              mail: user.mail,
                            },
                          ]);

                      return values;
                    })(),
                  ),
              );

              const nextUsernames = new Set<string>();
              for (const username of papercutUsernames)
                if (entraUsers.has(username)) nextUsernames.add(username);

              type Values = Array<InferInsertModel<UsersTable>>;
              const puts: Values = [];
              const dels: Values = [];

              for (const username of nextUsernames) {
                const entraUser = entraUsers.get(username)!;
                puts.push({
                  type: "papercut",
                  username,
                  oauth2UserId: entraUser.id,
                  oauth2ProviderId: oauth2Provider.id,
                  name: entraUser.displayName,
                  email: entraUser.mail,
                  deletedAt: null,
                  tenantId: oauth2Provider.tenantId,
                });
              }

              for (const [username, user] of prevUsers)
                if (!nextUsernames.has(username)) {
                  const entraUser = entraUsers.get(username);
                  dels.push({
                    type: "papercut",
                    username: entraUser?.displayName ?? user.username,
                    oauth2UserId: entraUser?.id ?? user.oauth2UserId,
                    oauth2ProviderId: oauth2Provider.id,
                    name: entraUser?.displayName ?? user.name,
                    email: entraUser?.mail ?? user.email,
                    deletedAt,
                    tenantId: oauth2Provider.tenantId,
                  });
                }

              const values = [...puts, ...dels];
              if (R.pipe(values, R.isNot(R.isEmpty)))
                users.push(...(await Users.put(values)));
            },
          );
          break;
        case Constants.GOOGLE:
          throw new Error("google sync is not implemented yet");
        default:
          throw new ApplicationError.NonExhaustiveValue(oauth2Provider.type);
      }

    return users;
  }

  export async function all() {
    await users();
    await billingAccounts();
    await billingAccountCustomerAuthorizations();
  }
}
