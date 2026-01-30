import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import { Api } from "../api";
import { separatedString, StringFromUnknown } from "../utils";
import { Constants } from "../utils/constants";
import { Xml } from "../xml";
import { PapercutContract } from "./contract";

export namespace Papercut {
  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/papercut/Client",
    {
      dependencies: [Api.Tenant.Default],
      effect: Effect.gen(function* () {
        const { execute } = yield* Api.Tenant;

        const setWebServicesAuthToken = Effect.fn(
          "Papercut.Client.setWebServicesAuthToken",
        )((value: PapercutContract.WebServicesAuthToken) =>
          HttpClientRequest.put("/papercut/auth-token").pipe(
            HttpClientRequest.schemaBodyJson(
              Schema.Struct({ value: PapercutContract.WebServicesAuthToken }),
            )({ value }),
            Effect.flatMap(execute),
          ),
        );

        const setTailscaleService = Effect.fn(
          "Papercut.Client.setTailscaleService",
        )(
          (service: PapercutContract.TailscaleService) =>
            HttpClientRequest.put("/papercut/tailscale-service").pipe(
              HttpClientRequest.schemaBodyJson(
                PapercutContract.TailscaleService,
              )(service),
            ),
          Effect.flatMap(execute),
        );

        return { setWebServicesAuthToken, setTailscaleService } as const;
      }),
    },
  ) {}

  const CommaSeparatedString = separatedString(",");
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
  } as const;
  type SharedAccountPropertySchemas = typeof SharedAccountPropertySchemas;

  export class SharedAccountBalanceAdjustmentFailure extends Data.TaggedError(
    "SharedAccountBalanceAdjustmentFailure",
  ) {}

  export class UserAndGroupSyncFailure extends Data.TaggedError(
    "UserAndGroupSyncFailure",
  ) {}

  export class WebServicesClient extends Effect.Service<WebServicesClient>()(
    "@printdesk/core/papercut/WebServicesClient",
    {
      dependencies: [
        Api.Tenant.Default,
        Xml.Rpc.Client.Default(
          `${Constants.PAPERCUT_SERVICE_PATH}${Constants.PAPERCUT_WEB_SERVICES_PATH}`,
        ),
      ],
      effect: Effect.gen(function* () {
        const { execute } = yield* Api.Tenant;
        const xmlRpc = yield* Xml.Rpc.Client;

        const gatewayInjectAuthTokenHeader = (inject = true) =>
          HttpClientRequest.setHeader(
            Constants.HEADER_NAMES
              .PAPERCUT_GATEWAY_INJECT_WEB_SERVICES_AUTH_TOKEN,
            inject.toString(),
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
              Effect.map(gatewayInjectAuthTokenHeader()),
              Effect.flatMap(execute),
              Effect.flatMap(xmlRpc.response(Xml.Rpc.BooleanResponse)),
              Effect.filterOrFail(
                Predicate.isTruthy,
                () => new SharedAccountBalanceAdjustmentFailure(),
              ),
            ),
        );

        const getGroupMembers = Effect.fn("Papercut.Client.getGroupMembers")(
          (groupName: string, offset: number, limit: number) =>
            xmlRpc
              .request("api.getGroupMembers", [
                Xml.ExplicitString.with(groupName),
                Xml.ExplicitInt.with(offset),
                Xml.ExplicitInt.with(limit),
              ])
              .pipe(
                Effect.map(gatewayInjectAuthTokenHeader()),
                Effect.flatMap(execute),
                Effect.flatMap(
                  xmlRpc.response(
                    Xml.Rpc.arrayResponse(Xml.ImplicitString.fields.value),
                  ),
                ),
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
              Effect.map(gatewayInjectAuthTokenHeader()),
              Effect.flatMap(execute),
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
            Effect.flatMap(execute),
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
            Effect.map(gatewayInjectAuthTokenHeader()),
            Effect.flatMap(execute),
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
              Effect.map(gatewayInjectAuthTokenHeader()),
              Effect.flatMap(execute),
              Effect.flatMap(
                xmlRpc.response(
                  Xml.Rpc.arrayResponse(Xml.ImplicitString.fields.value),
                ),
              ),
            ),
        );

        const listUserGroups = Effect.fn("Papercut.Client.listUserGroups")(
          (offset: number, limit: number) =>
            xmlRpc
              .request("api.listUserGroups", [
                Xml.ExplicitInt.with(offset),
                Xml.ExplicitInt.with(limit),
              ])
              .pipe(
                Effect.map(gatewayInjectAuthTokenHeader()),
                Effect.flatMap(execute),
                Effect.flatMap(
                  xmlRpc.response(
                    Xml.Rpc.arrayResponse(Xml.ImplicitString.fields.value),
                  ),
                ),
              ),
        );

        const performUserAndGroupSync = xmlRpc
          .request("api.performUserAndGroupSync", [])
          .pipe(
            Effect.map(gatewayInjectAuthTokenHeader()),
            Effect.flatMap(execute),
            Effect.flatMap(xmlRpc.response(Xml.Rpc.BooleanResponse)),
            Effect.filterOrFail(
              Predicate.isTruthy,
              () => new UserAndGroupSyncFailure(),
            ),
            Effect.withSpan("Papercut.Client.performUserAndGroupSync"),
          );

        return {
          adjustSharedAccountAccountBalance,
          getGroupMembers,
          getSharedAccountProperties,
          getTaskStatus,
          getTotalUsers,
          listSharedAccounts,
          listUserGroups,
          performUserAndGroupSync,
        } as const;
      }),
    },
  ) {}
}
