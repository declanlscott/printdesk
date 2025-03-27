import * as v from "valibot";

import { ServerErrors } from "../errors";
import { objectsTuple } from "../utils/shared";

export const updateServerTailnetUriSchema = v.object({
  tailnetUri: v.pipe(v.string(), v.url()),
});

export type UpdateServerTailnetUri = v.InferOutput<
  typeof updateServerTailnetUriSchema
>;

export const updateServerAuthTokenSchema = v.object({
  authToken: v.string(),
});

export type UpdateServerAuthToken = v.InferOutput<
  typeof updateServerAuthTokenSchema
>;

export type SharedAccountPropertyTypeMap = {
  "access-groups": string;
  "access-users": string;
  "account-id": number;
  balance: number;
  "comment-option": string;
  disabled: boolean;
  "invoice-option": string;
  notes: string;
  "overdraft-amount": number;
  pin: string | number | boolean;
  restricted: boolean;
};

export const xmlRpcResponseTuple = <
  const TObjects extends Array<v.ObjectEntries>,
>(
  ...objects: TObjects
) =>
  objectsTuple(
    { "?xml": objectsTuple({ "#text": v.literal("") }) },
    { methodResponse: objectsTuple(...objects) },
  );

export const xmlRpcFaultResponseSchema = v.pipe(
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

export const xmlRpcBooleanResponseSchema = v.pipe(
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

export const xmlRpcIntResponseSchema = v.pipe(
  xmlRpcResponseTuple({
    params: objectsTuple({
      param: objectsTuple({
        value: objectsTuple({
          int: objectsTuple({
            "#text": v.pipe(v.number(), v.integer()),
          }),
        }),
      }),
    }),
  }),
  v.transform((xml) => ({
    int: xml[1].methodResponse[0].params[0].param[0].value[0].int[0]["#text"],
  })),
);

export const xmlRpcListResponseSchema = v.pipe(
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

export const xmlRpcAdjustSharedAccountAccountBalanceResponseSchema = v.pipe(
  v.union([xmlRpcBooleanResponseSchema, xmlRpcFaultResponseSchema]),
  v.transform((xml) => {
    if ("fault" in xml)
      throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

    return xml.boolean;
  }),
);

export const xmlRpcGetSharedAccountPropertiesResponseSchema = <
  const TPropertyNames extends Array<keyof SharedAccountPropertyTypeMap>,
>() =>
  v.pipe(
    v.union([xmlRpcListResponseSchema, xmlRpcFaultResponseSchema]),
    v.transform((xml) => {
      if ("fault" in xml)
        throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

      return xml.list as {
        [K in keyof TPropertyNames]: TPropertyNames[K] extends keyof SharedAccountPropertyTypeMap
          ? SharedAccountPropertyTypeMap[TPropertyNames[K]] | undefined
          : never;
      };
    }),
  );

export const xmlRpcGetTaskStatusResponseSchema = v.pipe(
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
    xmlRpcFaultResponseSchema,
  ]),
  v.transform((xml) => {
    if ("fault" in xml)
      throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

    return {
      completed:
        xml[1].methodResponse[0].params[0].param[0].value[0].struct[0].member[1]
          .value[0].boolean[0]["#text"] === 1,
    };
  }),
);

export const xmlRpcGetTotalUsersResponseSchema = v.pipe(
  v.union([xmlRpcIntResponseSchema, xmlRpcFaultResponseSchema]),
  v.transform((xml) => {
    if ("fault" in xml)
      throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

    return xml.int;
  }),
);

export const xmlRpcListSharedAccountsResponseSchema = v.pipe(
  v.union([xmlRpcListResponseSchema, xmlRpcFaultResponseSchema]),
  v.transform((xml) => {
    if ("fault" in xml)
      throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

    return xml.list as Array<string>;
  }),
);

export const xmlRpcListUserAccountsResponseSchema = v.pipe(
  v.union([xmlRpcListResponseSchema, xmlRpcFaultResponseSchema]),
  v.transform((xml) => {
    if ("fault" in xml)
      throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

    return xml.list as Array<string>;
  }),
);

export const xmlRpcListUserSharedAccountsResponseSchema = v.pipe(
  v.union([xmlRpcListResponseSchema, xmlRpcFaultResponseSchema]),
  v.transform((xml) => {
    if ("fault" in xml)
      throw new ServerErrors.XmlRpcFault(xml.fault.code, xml.fault.string);

    return xml.list as Array<string>;
  }),
);
