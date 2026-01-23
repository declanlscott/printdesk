import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";

import { Api } from "../api";
import { TailscaleContract } from "./contract";

export namespace Tailscale {
  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/tailscale/Client",
    {
      accessors: true,
      dependencies: [Api.HttpClient.Default],
      effect: Effect.gen(function* () {
        const { execute } = yield* Api.HttpClient;

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
              Effect.flatMap(execute),
            ),
        );

        return { setOauthClient } as const;
      }),
    },
  ) {}
}
