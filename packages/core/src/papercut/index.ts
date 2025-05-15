import { Resource } from "sst";
import * as v from "valibot";

import { Ssm } from "../aws";
import { Api } from "../backend/api";
import { ServerErrors } from "../errors";
import { useTenant } from "../tenants/context";
import { Constants } from "../utils/constants";
import { useXml } from "../xml/context";
import {
  xmlRpcAdjustSharedAccountAccountBalanceResponseSchema,
  xmlRpcGetSharedAccountPropertiesResponseSchema,
  xmlRpcGetTaskStatusResponseSchema,
  xmlRpcGetTotalUsersResponseSchema,
  xmlRpcListSharedAccountsResponseSchema,
  xmlRpcListUserAccountsResponseSchema,
  xmlRpcListUserSharedAccountsResponseSchema,
} from "./shared";

import type { SharedAccountPropertyTypeMap } from "./shared";

export namespace Papercut {
  export const setTailnetServerUri = async (uri: string) =>
    Ssm.putParameter({
      Name: Ssm.buildName(
        Resource.TenantParameters.tailnetPapercutServerUri.nameTemplate,
        useTenant().id,
      ),
      Value: uri,
      Type: "String",
      Overwrite: true,
    });

  export async function setServerAuthToken(token: string) {
    const name = Ssm.buildName(
      Resource.TenantParameters.papercutServerAuthToken.nameTemplate,
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
        Resource.TenantParameters.papercutServerAuthToken.nameTemplate,
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
      throw new ServerErrors.InternalServerError(
        "Failed to adjust account balance",
        { cause: text },
      );

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
      throw new ServerErrors.InternalServerError(
        "Failed to get shared account properties",
        { cause: text },
      );

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
      throw new ServerErrors.InternalServerError("Failed to get task status", {
        cause: text,
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
      throw new ServerErrors.InternalServerError("Failed to get total users", {
        cause: text,
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
        throw new ServerErrors.InternalServerError(
          "Failed to list shared accounts",
          { cause: text },
        );

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
        throw new ServerErrors.InternalServerError(
          "Failed to list user accounts",
          { cause: text },
        );

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
        throw new ServerErrors.InternalServerError(
          "Failed to list user shared accounts",
          { cause: text },
        );

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
}
