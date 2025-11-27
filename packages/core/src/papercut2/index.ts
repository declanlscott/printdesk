import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Api } from "../api";
import { Constants } from "../utils/constants";
import { Xml } from "../xml2";
import { PapercutContract } from "./contract";

export namespace Papercut {
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

        return {
          setTailnetUri,
          setAuthToken,
          adjustSharedAccountAccountBalance,
        } as const;
      }),
    },
  ) {}
}
