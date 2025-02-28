import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { Api } from "../backend/api";
import { BillingAccounts } from "../billing-accounts";
import { useTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { Ssm } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";
import { useXml } from "../utils/xml";
import {
  xmlRpcAdjustSharedAccountAccountBalanceResponseSchema,
  xmlRpcGetSharedAccountPropertiesResponseSchema,
  xmlRpcGetTaskStatusResponseSchema,
  xmlRpcGetTotalUsersResponseSchema,
  xmlRpcListSharedAccountsResponseSchema,
  xmlRpcListUserAccountsResponseSchema,
  xmlRpcListUserSharedAccountsResponseSchema,
} from "./shared";

import type { InferInsertModel } from "drizzle-orm";
import type {
  BillingAccount,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountsTable,
} from "../billing-accounts/sql";
import type { User, UsersTable } from "../users/sql";
import type { SharedAccountPropertyTypeMap } from "./shared";

export namespace Papercut {
  export const setTailnetServerUri = async (uri: string) =>
    Ssm.putParameter({
      Name: Ssm.buildName(
        Resource.Aws.tenant.parameters.tailnetPapercutServerUri.nameTemplate,
        useTenant().id,
      ),
      Value: uri,
      Type: "String",
      Overwrite: true,
    });

  export async function setServerAuthToken(token: string) {
    const name = Ssm.buildName(
      Resource.Aws.tenant.parameters.papercutServerAuthToken.nameTemplate,
      useTenant().id,
    );

    await Ssm.putParameter({
      Name: name,
      Value: token,
      Type: "SecureString",
      Overwrite: true,
    });

    await Api.invalidateCache([`/parameters${name}`]);
  }

  export const getServerAuthToken = async () =>
    Api.getParameter(
      Ssm.buildName(
        Resource.Aws.tenant.parameters.papercutServerAuthToken.nameTemplate,
        useTenant().id,
      ),
    );

  const xmlRpcPath = "/papercut/server/rpc/api/xmlrpc";

  export async function adjustSharedAccountAccountBalance(
    sharedAccountName: string,
    amount: number,
    comment: string,
  ) {
    const authToken = await getServerAuthToken();

    const res = await Api.send(xmlRpcPath, {
      method: "POST",
      body: useXml().builder.build({
        methodCall: {
          methodName: "api.adjustSharedAccountAccountBalance",
          params: {
            param: [
              { value: { string: authToken } },
              { value: { string: sharedAccountName } },
              { value: { double: amount } },
              { value: { string: comment } },
            ],
          },
        },
      }) as string,
    });

    const text = await res.text();

    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text,
        },
      });

    const success = v.parse(
      xmlRpcAdjustSharedAccountAccountBalanceResponseSchema,
      useXml().parser.parse(text),
    );

    return success;
  }

  export async function getSharedAccountProperties<
    const TPropertyNames extends Array<keyof SharedAccountPropertyTypeMap>,
  >(sharedAccountName: string, ...propertyNames: TPropertyNames) {
    const authToken = await getServerAuthToken();

    const res = await Api.send(xmlRpcPath, {
      method: "POST",
      body: useXml().builder.build({
        methodCall: {
          methodName: "api.getSharedAccountProperties",
          params: {
            param: [
              { value: { string: authToken } },
              { value: { string: sharedAccountName } },
              {
                value: {
                  array: {
                    data: {
                      value: propertyNames.map((name) => ({ string: name })),
                    },
                  },
                },
              },
            ],
          },
        },
      }) as string,
    });

    const text = await res.text();

    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text,
        },
      });

    const properties = v.parse(
      xmlRpcGetSharedAccountPropertiesResponseSchema<TPropertyNames>(),
      useXml().parser.parse(text),
    );

    return properties;
  }

  export async function getTaskStatus() {
    const res = await Api.send(xmlRpcPath, {
      method: "POST",
      body: useXml().builder.build({
        methodCall: { methodName: "api.getTaskStatus" },
      }) as string,
    });

    const text = await res.text();

    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text,
        },
      });

    const taskStatus = v.parse(
      xmlRpcGetTaskStatusResponseSchema,
      useXml().parser.parse(text),
    );

    return taskStatus;
  }

  export async function getTotalUsers() {
    const authToken = await getServerAuthToken();

    const res = await Api.send(xmlRpcPath, {
      method: "POST",
      body: useXml().builder.build({
        methodCall: { methodName: "api.getTotalUsers" },
        params: { param: [{ value: { string: authToken } }] },
      }) as string,
    });

    const text = await res.text();

    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text,
        },
      });

    const totalUsers = v.parse(
      xmlRpcGetTotalUsersResponseSchema,
      useXml().parser.parse(text),
    );

    return totalUsers;
  }

  export async function listSharedAccounts() {
    const authToken = await getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(xmlRpcPath, {
        method: "POST",
        body: useXml().builder.build({
          methodCall: {
            methodName: "api.listSharedAccounts",
            params: {
              param: [
                { value: { string: authToken } },
                { value: { int: offset } },
                { value: { int: Constants.PAPERCUT_API_PAGINATION_LIMIT } },
              ],
            },
          },
        }) as string,
      });

      const text = await res.text();

      if (!res.ok)
        throw new HttpError.BadGateway({
          upstream: {
            error: new HttpError.Error(res.statusText, res.status),
            text,
          },
        });

      const sharedAccounts = v.parse(
        xmlRpcListSharedAccountsResponseSchema,
        useXml().parser.parse(text),
      );

      all.push(...sharedAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore =
        sharedAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }

  export async function listUserAccounts() {
    const authToken = await getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(xmlRpcPath, {
        method: "POST",
        body: useXml().builder.build({
          methodCall: {
            methodName: "api.listUserAccounts",
            params: {
              param: [
                { value: { string: authToken } },
                { value: { int: offset } },
                { value: { int: Constants.PAPERCUT_API_PAGINATION_LIMIT } },
              ],
            },
          },
        }) as string,
      });

      const text = await res.text();

      if (!res.ok)
        throw new HttpError.BadGateway({
          upstream: {
            error: new HttpError.Error(res.statusText, res.status),
            text,
          },
        });

      const userAccounts = v.parse(
        xmlRpcListUserAccountsResponseSchema,
        useXml().parser.parse(text),
      );

      all.push(...userAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore = userAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }

  export async function listUserSharedAccounts(
    username: string,
    ignoreUserAccountSelectionConfig: boolean,
  ) {
    const authToken = await getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(xmlRpcPath, {
        method: "POST",
        body: useXml().builder.build({
          methodCall: {
            methodName: "api.listUserSharedAccounts",
            params: [
              { value: { string: authToken } },
              { value: { string: username } },
              { value: { int: offset } },
              { value: { int: Constants.PAPERCUT_API_PAGINATION_LIMIT } },
              { value: { boolean: ignoreUserAccountSelectionConfig ? 1 : 0 } },
            ],
          },
        }) as string,
      });

      const text = await res.text();

      if (!res.ok)
        throw new HttpError.BadGateway({
          upstream: {
            error: new HttpError.Error(res.statusText, res.status),
            text,
          },
        });

      const userSharedAccounts = v.parse(
        xmlRpcListUserSharedAccountsResponseSchema,
        useXml().parser.parse(text),
      );

      all.push(...userSharedAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore =
        userSharedAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }

  export const testConnection = async () => {
    await getTotalUsers();
  };

  export async function syncBillingAccounts() {
    const tenant = useTenant();

    const next = new Map<
      NonNullable<BillingAccount["papercutAccountId"]>,
      { name: BillingAccount["name"] }
    >();

    const names = await listSharedAccounts();

    // NOTE: Batch api requests to avoid overloading the papercut server
    for (const batch of R.chunk(
      names,
      Constants.PAPERCUT_API_REQUEST_BATCH_SIZE,
    ))
      await Promise.all(
        batch.map(async (name) => {
          const [accountId] = await getSharedAccountProperties(
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

  export async function syncUsers() {
    const tenant = useTenant();

    const taskStatus = await getTaskStatus();
    if (!taskStatus.completed)
      throw new HttpError.ServiceUnavailable(
        "PaperCut is syncing with its upstream user directory, please try again later.",
      );

    const papercutBillingAccounts = new Map(
      await syncBillingAccounts().then(
        R.map((account) => [account.name, account] as const),
      ),
    );

    const nextUsernames = new Set(await listUserAccounts());

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
            await listUserSharedAccounts(username, true),
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
