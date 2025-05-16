import { eq } from "drizzle-orm";
import * as R from "remeda";

import { Papercut } from ".";
import { Auth } from "../auth";
import { EntraId } from "../auth/entra-id";
import { BillingAccounts } from "../billing-accounts";
import { useTransaction } from "../drizzle/context";
import { ServerErrors } from "../errors";
import { SharedErrors } from "../errors/shared";
import { Graph } from "../graph";
import { withGraph } from "../graph/context";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { tenantMetadataTable } from "../tenants/sql";
import { Users } from "../users";
import { Constants } from "../utils/constants";

import type { User as GraphUser } from "@microsoft/microsoft-graph-types";
import type { InferInsertModel } from "drizzle-orm";
import type {
  BillingAccount,
  BillingAccountCustomerAuthorization,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountsTable,
} from "../billing-accounts/sql";
import type { User, UsersTable } from "../users/sql";
import type { NonNullableProperties, Prettify } from "../utils/types";

export namespace Sync {
  export async function all() {
    let hasChanged = false;

    const flagIfChanged = <TValue>(values: Array<TValue>) =>
      R.pipe(
        values,
        R.conditional([R.isNot(R.isEmpty), () => (hasChanged = true)]),
      );

    await users().then(flagIfChanged);
    await billingAccounts().then(flagIfChanged);
    await billingAccountCustomerAuthorizations().then(flagIfChanged);

    await useTransaction((tx) =>
      tx
        .update(tenantMetadataTable)
        .set({ lastPapercutSyncAt: new Date() })
        .where(eq(tenantMetadataTable.tenantId, useTenant().id)),
    );

    if (hasChanged) await poke("/tenant");
  }

  export async function users() {
    const taskStatus = await Papercut.getTaskStatus();
    if (!taskStatus.completed)
      throw new ServerErrors.ServiceUnavailable(
        "papercut task status not yet completed",
      );

    const usernames = new Set(await Papercut.listUserAccounts());

    const identityProviders = await Auth.readIdentityProviders();

    const next = new Map<
      User["subjectId"],
      Pick<User, "identityProviderId" | "username" | "name" | "email">
    >();
    for (const identityProvider of identityProviders)
      switch (identityProvider.kind) {
        case Constants.ENTRA_ID:
          await withGraph(
            () =>
              Graph.Client.initWithMiddleware({
                authProvider: {
                  getAccessToken: async () =>
                    EntraId.applicationAccessToken(identityProvider.id),
                },
              }),
            async () => {
              const groups = await Auth.readIdentityProviderUserGroups(
                identityProvider.id,
              );

              const users: Array<
                Prettify<
                  NonNullableProperties<
                    Required<
                      Pick<
                        GraphUser,
                        "userPrincipalName" | "id" | "displayName" | "mail"
                      >
                    >
                  >
                >
              > = [];
              for (const group of groups)
                await Graph.users(group.id).then(
                  R.forEach(({ userPrincipalName, id, displayName, mail }) => {
                    if (userPrincipalName && id && displayName && mail)
                      users.push({ userPrincipalName, id, displayName, mail });
                  }),
                );

              for (const user of users)
                if (usernames.has(user.userPrincipalName))
                  next.set(user.id, {
                    identityProviderId: identityProvider.id,
                    username: user.userPrincipalName,
                    name: user.displayName,
                    email: user.mail,
                  });
            },
          );

          break;
        case Constants.GOOGLE:
          throw new Error("Google sync not implemented");
        default:
          throw new SharedErrors.NonExhaustiveValue(identityProvider.kind);
      }

    const prev = await Users.byOrigin("papercut").then(
      (users) =>
        new Map<User["subjectId"], User>(
          users.map((user) => [user.subjectId, user]),
        ),
    );

    const now = new Date();
    const values = R.pipe(
      [...prev.keys().toArray(), ...next.keys().toArray()],
      R.unique(),
      R.reduce(
        (users, subjectId) => {
          const prevUser = prev.get(subjectId);
          const nextUser = next.get(subjectId);

          const base = {
            origin: "papercut",
            subjectId,
            tenantId: useTenant().id,
          } as const;

          // Create (or restore) user
          if ((!prevUser || prevUser.deletedAt) && nextUser) {
            users.push({
              ...base,
              ...nextUser,
              id: prevUser?.id,
              role: "customer",
              createdAt: prevUser?.createdAt ?? now,
              updatedAt: now,
              deletedAt: null,
            });

            return users;
          }

          // Delete user if it's not already
          if (prevUser && !prevUser.deletedAt && !nextUser) {
            users.push({
              ...prevUser,
              ...base,
              role: "customer",
              updatedAt: now,
              deletedAt: now,
            });

            return users;
          }

          // Update user if some properties have changed
          if (
            prevUser &&
            nextUser &&
            !R.isDeepEqual(
              R.pick(prevUser, ["name", "username", "email"]),
              R.pick(nextUser, ["name", "username", "email"]),
            )
          ) {
            users.push({
              ...prevUser,
              ...base,
              ...nextUser,
              updatedAt: now,
              deletedAt: null,
            });

            return users;
          }

          // Do nothing
          return users;
        },
        [] as Array<InferInsertModel<UsersTable>>,
      ),
    );

    if (R.isEmpty(values)) return [];

    return Users.put(values);
  }

  export async function billingAccounts() {
    const names = await Papercut.listSharedAccounts();

    const next = new Map<
      BillingAccount["papercutAccountId"],
      BillingAccount["name"]
    >();

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
            throw new Error(`Missing papercut account-id for ${name}`);

          next.set(accountId, name);
        }),
      );

    const prev = await BillingAccounts.byOrigin("papercut").then(
      (billingAccounts) =>
        new Map<BillingAccount["papercutAccountId"], BillingAccount>(
          billingAccounts.map((billingAccount) => [
            billingAccount.papercutAccountId,
            billingAccount,
          ]),
        ),
    );

    const now = new Date();
    const values = R.pipe(
      [...prev.keys().toArray(), ...next.keys().toArray()],
      R.unique(),
      R.reduce(
        (billingAccounts, papercutAccountId) => {
          const billingAccount = prev.get(papercutAccountId);
          const name = next.get(papercutAccountId);

          const base = {
            origin: "papercut",
            papercutAccountId,
            tenantId: useTenant().id,
          } as const;

          // Create (or restore) billing account
          if ((!billingAccount || billingAccount.deletedAt) && name) {
            billingAccounts.push({
              ...base,
              id: billingAccount?.id,
              name,
              createdAt: billingAccount?.createdAt ?? now,
              updatedAt: now,
              deletedAt: null,
            });

            return billingAccounts;
          }

          // Delete billing account if it's not already
          if (billingAccount && !billingAccount.deletedAt && !name) {
            billingAccounts.push({
              ...billingAccount,
              ...base,
              updatedAt: now,
              deletedAt: now,
            });

            return billingAccounts;
          }

          // Update billing account if name changed
          if (billingAccount && name && billingAccount.name !== name) {
            billingAccounts.push({
              ...billingAccount,
              ...base,
              name,
              updatedAt: now,
              deletedAt: null,
            });

            return billingAccounts;
          }

          // Do nothing
          return billingAccounts;
        },
        [] as Array<InferInsertModel<BillingAccountsTable>>,
      ),
    );

    if (R.isEmpty(values)) return [];

    return BillingAccounts.put(values);
  }

  export async function billingAccountCustomerAuthorizations() {
    const [users, billingAccounts] = await useTransaction(() =>
      Promise.all([
        Users.byOrigin("papercut"),
        BillingAccounts.byOrigin("papercut").then(
          (billingAccounts) =>
            new Map<BillingAccount["name"], BillingAccount>(
              billingAccounts.map((billingAccount) => [
                billingAccount.name,
                billingAccount,
              ]),
            ),
        ),
      ]),
    );

    type CustomerAuthorizationCompositeKey =
      `${BillingAccountCustomerAuthorization["customerId"]}${typeof Constants.TOKEN_DELIMITER}${BillingAccountCustomerAuthorization["billingAccountId"]}`;

    const next = new Set<CustomerAuthorizationCompositeKey>();
    for (const batch of R.chunk(
      users,
      Constants.PAPERCUT_API_REQUEST_BATCH_SIZE,
    ))
      await Promise.all(
        batch.map(async (user) => {
          const accountNames = await Papercut.listUserSharedAccounts(
            user.username,
            true,
          );

          for (const name of accountNames) {
            const billingAccount = billingAccounts.get(name);
            if (billingAccount)
              next.add(
                `${user.id}${Constants.TOKEN_DELIMITER}${billingAccount.id}`,
              );
          }
        }),
      );

    const prev = await BillingAccounts.readCustomerAuthorizationsByOrigin(
      "papercut",
    ).then(
      (customerAuthorizations) =>
        new Map<
          CustomerAuthorizationCompositeKey,
          BillingAccountCustomerAuthorization
        >(
          customerAuthorizations.map((customerAuthorization) => [
            `${customerAuthorization.customerId}${Constants.TOKEN_DELIMITER}${customerAuthorization.billingAccountId}`,
            customerAuthorization,
          ]),
        ),
    );

    const now = new Date();
    const values = R.pipe(
      [...prev.keys().toArray(), ...next.values().toArray()],
      R.unique(),
      R.reduce(
        (customerAuthorizations, compositeKey) => {
          const [customerId, billingAccountId] = compositeKey.split(
            Constants.TOKEN_DELIMITER,
          );

          const customerAuthorization = prev.get(compositeKey);
          const isAuthorized = next.has(compositeKey);

          // Create (or restore) customer authorization
          if (
            (!customerAuthorization || customerAuthorization.deletedAt) &&
            isAuthorized
          ) {
            customerAuthorizations.push({
              id: customerAuthorization?.id,
              customerId,
              billingAccountId,
              tenantId: useTenant().id,
              createdAt: customerAuthorization?.createdAt ?? now,
              updatedAt: now,
              deletedAt: null,
            });

            return customerAuthorizations;
          }

          // Delete customer authorization if it's not already
          if (
            customerAuthorization &&
            !customerAuthorization.deletedAt &&
            !isAuthorized
          ) {
            customerAuthorizations.push({
              ...customerAuthorization,
              updatedAt: now,
              deletedAt: now,
            });

            return customerAuthorizations;
          }

          // Do nothing
          return customerAuthorizations;
        },
        [] as Array<
          InferInsertModel<BillingAccountCustomerAuthorizationsTable>
        >,
      ),
    );

    if (R.isEmpty(values)) return [];

    return BillingAccounts.putCustomerAuthorizations(values);
  }
}
