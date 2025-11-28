import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Api } from "../api";
import { Constants } from "../utils/constants";
import { CommaSeparatedString, StringFromUnknown } from "../utils2";
import { Xml } from "../xml2";
import { PapercutContract } from "./contract";

export namespace Papercut {
  const SharedAccountPropertySchemas = {
    "access-groups": CommaSeparatedString,
    "access-users": CommaSeparatedString,
    "account-id": Schema.NonNegativeInt,
    balance: Schema.Number,
    "comment-option": Schema.Literal(
      "NO_COMMENT",
      "COMMENT_REQUIRED",
      "COMMENT_OPTIONAL",
    ),
    disabled: Schema.Boolean,
    "invoice-option": Schema.Literal(
      "ALWAYS_INVOICE",
      "NEVER_INVOICE",
      "USER_CHOICE_ON",
      "USER_CHOICE_OFF",
    ),
    notes: Schema.String,
    "overdraft-amount": Schema.Number,
    pin: StringFromUnknown,
    restricted: Schema.Boolean,
  };
  type SharedAccountPropertySchemas = typeof SharedAccountPropertySchemas;

  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/papercut/Client",
    {
      dependencies: [
        Api.Http.Default,
        Xml.Rpc.Client.Default(
          `${Constants.PAPERCUT_SERVER_PATH_PREFIX}${Constants.PAPERCUT_WEB_SERVICES_API_PATH}`,
        ),
      ],
      effect: Effect.gen(function* () {
        const httpClient = yield* Api.Http.client;
        const xmlRpc = yield* Xml.Rpc.Client;

        const setTailnetUri = Effect.fn("Papercut.Client.setTailnetUri")(
          (value: PapercutContract.TailnetUri) =>
            HttpClientRequest.put(
              `${Constants.PAPERCUT_SERVER_PATH_PREFIX}/tailnet-uri`,
            ).pipe(
              HttpClientRequest.schemaBodyJson(
                Schema.Struct({ value: PapercutContract.TailnetUri }),
              )({ value }),
              Effect.flatMap(httpClient.execute),
            ),
        );

        const setAuthToken = Effect.fn("Papercut.Client.setAuthToken")(
          (value: PapercutContract.AuthToken) =>
            HttpClientRequest.put(
              `${Constants.PAPERCUT_SERVER_PATH_PREFIX}/auth-token`,
            ).pipe(
              HttpClientRequest.schemaBodyJson(
                Schema.Struct({ value: PapercutContract.AuthToken }),
              )({ value }),
              Effect.flatMap(httpClient.execute),
            ),
        );

        const injectAuthHeader = HttpClientRequest.setHeader(
          Constants.HEADER_KEYS.PAPERCUT_INJECT_AUTH,
          "true",
        );

        const adjustSharedAccountAccountBalance = Effect.fn(
          "Papercut.Client.adjustSharedAccountAccountBalance",
        )((sharedAccountName: string, amount: number, comment: string) =>
          xmlRpc
            .request("api.adjustSharedAccountAccountBalance", [
              Xml.ExplicitString.with(sharedAccountName),
              Xml.ExplicitDouble.with(amount),
              Xml.ExplicitString.with(comment),
            ])
            .pipe(
              Effect.map(injectAuthHeader),
              Effect.flatMap(httpClient.execute),
              Effect.flatMap(xmlRpc.response(Xml.Rpc.BooleanResponse)),
            ),
        );

        const getSharedAccountProperties = <
          TPropertyKeys extends Array<keyof SharedAccountPropertySchemas>,
        >(
          sharedAccountName: string,
          ...propertyKeys: TPropertyKeys
        ) =>
          xmlRpc
            .request("api.getSharedAccountProperties", [
              Xml.ExplicitString.with(sharedAccountName),
              Xml.ExplicitStringArray.with(propertyKeys),
            ])
            .pipe(
              Effect.map(injectAuthHeader),
              Effect.flatMap(httpClient.execute),
              Effect.flatMap(
                xmlRpc.response(
                  Xml.Rpc.tupleResponse(
                    ...(propertyKeys.map(
                      (key) => SharedAccountPropertySchemas[key],
                    ) as {
                      [TKey in keyof TPropertyKeys]: SharedAccountPropertySchemas[TPropertyKeys[TKey]];
                    }),
                  ),
                ),
              ),
              Effect.withSpan("Papercut.Client.getSharedAccountProperties"),
            );

        const getTaskStatus = xmlRpc
          .request("api.getTaskStatus", [])
          .pipe(
            Effect.flatMap(httpClient.execute),
            Effect.flatMap(
              xmlRpc.response(
                Xml.Rpc.structResponse(
                  Xml.member("completed", Xml.ExplicitBoolean.fields.value),
                  Xml.member("message", Xml.ImplicitString.fields.value),
                ),
              ),
            ),
            Effect.withSpan("Papercut.Client.getTaskStatus"),
          );

        const getTotalUsers = xmlRpc
          .request("api.getTotalUsers", [])
          .pipe(
            Effect.map(injectAuthHeader),
            Effect.flatMap(httpClient.execute),
            Effect.flatMap(xmlRpc.response(Xml.Rpc.IntResponse)),
            Effect.withSpan("Papercut.Client.getTotalUsers"),
          );

        const listSharedAccounts = Effect.fn(
          "Papercut.Client.listSharedAccounts",
        )((offset: number, limit: number) =>
          xmlRpc
            .request("api.listSharedAccounts", [
              Xml.ExplicitInt.with(offset),
              Xml.ExplicitInt.with(limit),
            ])
            .pipe(
              Effect.map(injectAuthHeader),
              Effect.flatMap(httpClient.execute),
              Effect.flatMap(
                xmlRpc.response(
                  Xml.Rpc.arrayResponse(Xml.ImplicitString.fields.value),
                ),
              ),
            ),
        );

        const listUserAccounts = Effect.fn("Papercut.Client.listUserAccounts")(
          (offset: number, limit: number) =>
            xmlRpc
              .request("api.listUserAccounts", [
                Xml.ExplicitInt.with(offset),
                Xml.ExplicitInt.with(limit),
              ])
              .pipe(
                Effect.map(injectAuthHeader),
                Effect.flatMap(httpClient.execute),
                Effect.flatMap(
                  xmlRpc.response(
                    Xml.Rpc.arrayResponse(Xml.ImplicitString.fields.value),
                  ),
                ),
              ),
        );

        const listUserSharedAccounts = Effect.fn(
          "Papercut.Client.listUserSharedAccounts",
        )(
          (
            username: string,
            offset: number,
            limit: number,
            ignoreUserAccountSelectionConfig: boolean,
          ) =>
            xmlRpc
              .request("api.listUserSharedAccounts", [
                Xml.ExplicitString.with(username),
                Xml.ExplicitInt.with(offset),
                Xml.ExplicitInt.with(limit),
                Xml.ExplicitBoolean.with(ignoreUserAccountSelectionConfig),
              ])
              .pipe(
                Effect.map(injectAuthHeader),
                Effect.flatMap(httpClient.execute),
                Effect.flatMap(
                  xmlRpc.response(
                    Xml.Rpc.arrayResponse(Xml.ImplicitString.fields.value),
                  ),
                ),
              ),
        );

        return {
          setTailnetUri,
          setAuthToken,
          adjustSharedAccountAccountBalance,
          getSharedAccountProperties,
          getTaskStatus,
          getTotalUsers,
          listSharedAccounts,
          listUserAccounts,
          listUserSharedAccounts,
        } as const;
      }),
    },
  ) {}
}
