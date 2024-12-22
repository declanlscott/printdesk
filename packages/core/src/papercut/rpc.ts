import * as v from "valibot";

import { Papercut } from ".";
import { Api } from "../api";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace PapercutRpc {
  const path = "/papercut/rpc/api/xmlrpc";

  const faultResponseSchema = v.pipe(
    v.tuple([
      v.object({
        "?xml": v.tuple([v.object({ "#text": v.literal("") })]),
      }),
      v.object({
        methodResponse: v.tuple([
          v.object({
            fault: v.tuple([
              v.object({
                value: v.tuple([
                  v.object({
                    struct: v.tuple([
                      v.object({
                        member: v.tuple([
                          v.object({
                            name: v.tuple([
                              v.object({ "#text": v.literal("faultString") }),
                            ]),
                          }),
                          v.object({
                            value: v.tuple([v.object({ "#text": v.string() })]),
                          }),
                        ]),
                      }),
                      v.object({
                        member: v.tuple([
                          v.object({
                            name: v.tuple([
                              v.object({ "#text": v.literal("faultCode") }),
                            ]),
                          }),
                          v.object({
                            value: v.tuple([
                              v.object({
                                int: v.tuple([
                                  v.object({ "#text": v.number() }),
                                ]),
                              }),
                            ]),
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    ]),
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
    v.tuple([
      v.object({
        "?xml": v.tuple([v.object({ "#text": v.literal("") })]),
      }),
      v.object({
        methodResponse: v.tuple([
          v.object({
            params: v.tuple([
              v.object({
                param: v.tuple([
                  v.object({
                    value: v.tuple([
                      v.object({
                        boolean: v.tuple([
                          v.object({ "#text": v.picklist([0, 1]) }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    ]),
    v.transform((xml) => ({
      boolean:
        xml[1].methodResponse[0].params[0].param[0].value[0].boolean[0][
          "#text"
        ] === 1,
    })),
  );

  const listResponseSchema = v.object({
    ["?xml"]: v.literal(""),
    methodResponse: v.object({
      params: v.object({
        param: v.object({
          value: v.object({
            array: v.object({
              data: v.object({
                value: v.array(v.string()),
              }),
            }),
          }),
        }),
      }),
    }),
  });

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
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const success = v.parse(
      v.pipe(
        v.union([booleanResponseSchema, faultResponseSchema]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new HttpError.InternalServerError(xml.fault.string);

          return xml.boolean;
        }),
      ),
      await res.text(),
    );

    return success;
  }

  export async function getSharedAccountProperties(
    sharedAccountName: string,
    propertyNames: Array<string>,
  ) {
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
                      value: propertyNames.map((name) => ({
                        string: name,
                      })),
                    },
                  },
                },
              },
            ],
          },
        },
      }),
    });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const properties = v.parse(
      v.pipe(
        v.union([
          v.tuple([
            v.object({
              "?xml": v.tuple([v.object({ "#text": v.literal("") })]),
            }),
            v.object({
              methodResponse: v.tuple([
                v.object({
                  params: v.tuple([
                    v.object({
                      param: v.tuple([
                        v.object({
                          value: v.tuple([
                            v.object({
                              array: v.tuple([
                                v.object({
                                  data: v.array(
                                    v.object({
                                      value: v.tuple([
                                        v.object({
                                          "#text": v.union([
                                            v.string(),
                                            v.number(),
                                          ]),
                                        }),
                                      ]),
                                    }),
                                  ),
                                }),
                              ]),
                            }),
                          ]),
                        }),
                      ]),
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
          faultResponseSchema,
        ]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new HttpError.InternalServerError(xml.fault.string);

          return xml[1].methodResponse[0].params[0].param[0].value[0].array[0].data.map(
            (data) => data.value[0]["#text"],
          );
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
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const taskStatus = v.parse(
      v.pipe(
        v.union([
          v.tuple([
            v.object({
              "?xml": v.tuple([v.object({ "#text": v.literal("") })]),
            }),
            v.object({
              methodResponse: v.tuple([
                v.object({
                  params: v.tuple([
                    v.object({
                      param: v.tuple([
                        v.object({
                          value: v.tuple([
                            v.object({
                              struct: v.tuple([
                                v.object({
                                  member: v.tuple([
                                    v.object({
                                      name: v.tuple([
                                        v.object({
                                          "#text": v.literal("completed"),
                                        }),
                                      ]),
                                    }),
                                    v.object({
                                      value: v.tuple([
                                        v.object({
                                          boolean: v.tuple([
                                            v.object({
                                              "#text": v.picklist([0, 1]),
                                            }),
                                          ]),
                                        }),
                                      ]),
                                    }),
                                  ]),
                                }),
                                v.object({
                                  member: v.tuple([
                                    v.object({
                                      name: v.tuple([
                                        v.object({
                                          "#text": v.literal("message"),
                                        }),
                                      ]),
                                    }),
                                    v.object({
                                      value: v.tuple([v.unknown()]),
                                    }),
                                  ]),
                                }),
                              ]),
                            }),
                          ]),
                        }),
                      ]),
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
          faultResponseSchema,
        ]),
        v.transform((xml) => {
          if ("fault" in xml)
            throw new HttpError.InternalServerError(xml.fault.string);

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
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const sharedAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml.methodResponse)
              throw new HttpError.InternalServerError(
                xml.methodResponse.fault.value.struct.member[0].value,
              );

            return xml.methodResponse.params.param.value.array.data.value;
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
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const userAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml.methodResponse)
              throw new HttpError.InternalServerError(
                xml.methodResponse.fault.value.struct.member[0].value,
              );

            return xml.methodResponse.params.param.value.array.data.value;
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
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const userSharedAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml.methodResponse)
              throw new HttpError.InternalServerError(
                xml.methodResponse.fault.value.struct.member[0].value,
              );

            return xml.methodResponse.params.param.value.array.data.value;
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
