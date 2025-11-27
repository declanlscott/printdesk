import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";

import { Api } from "../api";
import { TailscaleContract } from "./contract";

export namespace Tailscale {
  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/tailscale/Client",
    {
      accessors: true,
      dependencies: [Api.Http.Default],
      effect: Effect.gen(function* () {
        const httpClient = yield* Api.Http.client;

        const setOauthClient = Effect.fn("Tailscale.Client.setOauthClient")(
          (
            id: TailscaleContract.OauthClient["id"],
            secret: TailscaleContract.OauthClient["secret"],
          ) =>
            HttpClientRequest.put("/tailscale/oauth-client").pipe(
              HttpClientRequest.schemaBodyJson(TailscaleContract.OauthClient)({
                id,
                secret,
              }),
              Effect.flatMap(httpClient.execute),
            ),
        );

        return { setOauthClient } as const;
      }),
    },
  ) {}
}
