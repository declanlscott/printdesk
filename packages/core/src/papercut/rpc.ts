import * as v from "valibot";

import { Papercut } from ".";
import { Api } from "../api";
import { Constants } from "../utils/constants";
import { HttpError, XmlRpcError } from "../utils/errors";
import { objectsTuple } from "../utils/shared";
import { useXml } from "../utils/xml";
import { xmlRpcResponseTuple } from "./shared";

import type { SharedAccountPropertyTypeMap } from "./shared";

export namespace PapercutRpc {
  const path = "/papercut/server/rpc/api/xmlrpc";

  const faultResponseSchema = v.pipe(
    xmlRpcResponseTuple({
      fault: objectsTuple({
        value: objectsTuple({
          struct: objectsTuple(
            {
              member: objectsTuple(
                {
                  name: objectsTuple({
                    "#text": v.literal("faultString"),
                  }),
                },
                { value: objectsTuple({ "#text": v.string() }) },
              ),
            },
            {
              member: objectsTuple(
                {
                  name: objectsTuple({
                    "#text": v.literal("faultCode"),
                  }),
                },
                {
                  value: objectsTuple({
                    int: objectsTuple({ "#text": v.number() }),
                  }),
                },
              ),
            },
          ),
        }),
      }),
    }),
    v.transform((xml) => {
      const [string, code] = xml[1].methodResponse[0].fault[0].value[0].struct;

      return {
        fault: {
          string: string.member[1].value[0]["#text"],
          code: code.member[1].value[0].int[0]["#text"],
        },
      };
    }),
  );

  const booleanResponseSchema = v.pipe(
    xmlRpcResponseTuple({
      params: objectsTuple({
        param: objectsTuple({
          value: objectsTuple({
            boolean: objectsTuple({
              "#text": v.picklist([0, 1]),
            }),
          }),
        }),
      }),
    }),
    v.transform((xml) => ({
      boolean:
        xml[1].methodResponse[0].params[0].param[0].value[0].boolean[0][
          "#text"
        ] === 1,
    })),
  );

  const listResponseSchema = v.pipe(
    xmlRpcResponseTuple({
      params: objectsTuple({
        param: objectsTuple({
          value: objectsTuple({
            array: objectsTuple({
              data: v.array(
                v.object({
                  value: v.tuple([v.unknown()]),
                }),
              ),
            }),
          }),
        }),
      }),
    }),
    v.transform((xml) => ({
      list: xml[1].methodResponse[0].params[0].param[0].value[0].array[0].data.map(
        (data) => {
          const value = data.value[0];

          if (!!value && typeof value === "object" && "#text" in value)
            return value["#text"];
        },
      ),
    })),
  );

  export async function adjustSharedAccountAccountBalance(
    sharedAccountName: string,
    amount: number,
    comment: string,
  ) {
    const authToken = await Papercut.getServerAuthToken();

    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      }),
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
      v.pipe(
        v.union([booleanResponseSchema, faultResponseSchema]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

          return xml.boolean;
        }),
      ),
      useXml().parser.parse(text),
    );

    return success;
  }

  export async function getSharedAccountProperties<
    const TPropertyNames extends Array<keyof SharedAccountPropertyTypeMap>,
  >(sharedAccountName: string, ...propertyNames: TPropertyNames) {
    const authToken = await Papercut.getServerAuthToken();

    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      }),
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
      v.pipe(
        v.union([listResponseSchema, faultResponseSchema]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

          return xml.list as {
            [K in keyof TPropertyNames]: TPropertyNames[K] extends keyof SharedAccountPropertyTypeMap
              ? SharedAccountPropertyTypeMap[TPropertyNames[K]] | undefined
              : never;
          };
        }),
      ),
      useXml().parser.parse(text),
    );

    return properties;
  }

  export async function getTaskStatus() {
    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: useXml().builder.build({
        methodCall: { methodName: "api.getTaskStatus" },
      }),
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
      v.pipe(
        v.union([
          xmlRpcResponseTuple({
            params: objectsTuple({
              param: objectsTuple({
                value: objectsTuple({
                  struct: objectsTuple(
                    {
                      member: objectsTuple(
                        {
                          name: objectsTuple({
                            "#text": v.literal("completed"),
                          }),
                        },
                        {
                          value: objectsTuple({
                            boolean: objectsTuple({
                              "#text": v.picklist([0, 1]),
                            }),
                          }),
                        },
                      ),
                    },
                    {
                      member: objectsTuple(
                        {
                          name: objectsTuple({
                            "#text": v.literal("message"),
                          }),
                        },
                        { value: v.tuple([v.unknown()]) },
                      ),
                    },
                  ),
                }),
              }),
            }),
          }),
          faultResponseSchema,
        ]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

          return {
            completed:
              xml[1].methodResponse[0].params[0].param[0].value[0].struct[0]
                .member[1].value[0].boolean[0]["#text"] === 1,
          };
        }),
      ),
      useXml().parser.parse(text),
    );

    return taskStatus;
  }

  export async function listSharedAccounts() {
    const authToken = await Papercut.getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(path, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        }),
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
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml)
              throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

            return xml.list as Array<string>;
          }),
        ),
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
    const authToken = await Papercut.getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(path, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        }),
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
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml)
              throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

            return xml.list as Array<string>;
          }),
        ),
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
    const authToken = await Papercut.getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(path, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        }),
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
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml)
              throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

            return xml.list as Array<string>;
          }),
        ),
        useXml().parser.parse(text),
      );

      all.push(...userSharedAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore =
        userSharedAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }
}
