import * as v from "valibot";

import { Papercut } from ".";
import { Api } from "../api";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { HttpError, XmlRpcError } from "../utils/errors";
import { objectsTuple } from "../utils/shared";
import { xmlRpcResponseTuple } from "./shared";

export namespace PapercutRpc {
  const path = "/papercut/rpc/api/xmlrpc";

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
      body: Utils.xmlBuilder.build({
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
    if (!res.ok) {
      console.error(
        "PapercutRpc.adjustSharedAccountAccountBalance error: ",
        res.status,
        res.statusText,
        await res.text(),
      );

      throw new HttpError.BadGateway();
    }

    const success = v.parse(
      v.pipe(
        v.union([booleanResponseSchema, faultResponseSchema]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

          return xml.boolean;
        }),
      ),
      await res.text(),
    );

    return success;
  }

  export async function getSharedAccountProperties<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TProperties extends Array<any>,
  >(sharedAccountName: string, propertyNames: Array<string>) {
    const authToken = await Papercut.getServerAuthToken();

    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: Utils.xmlBuilder.build({
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
    if (!res.ok) {
      console.error(
        "PapercutRpc.getSharedAccountProperties error: ",
        res.status,
        res.statusText,
        await res.text(),
      );

      throw new HttpError.BadGateway();
    }

    const properties = v.parse(
      v.pipe(
        v.union([listResponseSchema, faultResponseSchema]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

          return xml.list as {
            [K in keyof TProperties]: TProperties[K] | undefined;
          };
        }),
      ),
      Utils.xmlParser.parse(await res.text()),
    );

    return properties;
  }

  export async function getTaskStatus() {
    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: Utils.xmlBuilder.build({
        methodCall: { methodName: "api.getTaskStatus" },
      }),
    });
    if (!res.ok) {
      console.error(
        "PapercutRpc.getTaskStatus error: ",
        res.status,
        res.statusText,
        await res.text(),
      );

      throw new HttpError.BadGateway();
    }

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
      await res.text(),
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
        body: Utils.xmlBuilder.build({
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
      if (!res.ok) {
        console.error(
          "PapercutRpc.listSharedAccounts error: ",
          res.status,
          res.statusText,
          await res.text(),
        );

        throw new HttpError.BadGateway();
      }

      const sharedAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml)
              throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

            return xml.list as Array<string>;
          }),
        ),
        await res.text(),
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
        body: Utils.xmlBuilder.build({
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
      if (!res.ok) {
        console.error(
          "PapercutRpc.listUserAccounts error: ",
          res.status,
          res.statusText,
          await res.text(),
        );

        throw new HttpError.BadGateway();
      }

      const userAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml)
              throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

            return xml.list as Array<string>;
          }),
        ),
        await res.text(),
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
        body: Utils.xmlBuilder.build({
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
      if (!res.ok) {
        console.error(
          "PapercutRpc.listUserSharedAccounts error: ",
          res.status,
          res.statusText,
          await res.text(),
        );

        throw new HttpError.BadGateway();
      }

      const userSharedAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml)
              throw new XmlRpcError.Fault(xml.fault.string, xml.fault.code);

            return xml.list as Array<string>;
          }),
        ),
        await res.text(),
      );

      all.push(...userSharedAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore =
        userSharedAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }
}
