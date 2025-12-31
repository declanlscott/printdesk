import { ConfidentialClientApplication } from "@azure/msal-node";
import { Oauth2Provider } from "@openauthjs/openauth/provider/oauth2";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Sst } from "../sst";
import { Constants } from "../utils/constants";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";
import type { IdentityProvidersContract } from "../identity-providers/contract";

export namespace EntraId {
  export interface ProviderConfig extends Oauth2WrappedConfig {
    tenant: string;
  }

  export const provider = ({ tenant, ...config }: ProviderConfig) =>
    Oauth2Provider({
      ...config,
      type: Constants.ENTRA_ID,
      endpoint: {
        authorization: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      },
    });

  export class ClientError extends Data.TaggedError("ClientError")<{
    readonly cause: unknown;
  }> {}

  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/auth/EntraIdClient",
    {
      accessors: true,
      dependencies: [Sst.Resource.layer],
      effect: (
        externalTenantId: IdentityProvidersContract.DataTransferObject["externalTenantId"],
      ) =>
        Effect.gen(function* () {
          const { clientId, clientSecret } =
            yield* Sst.Resource.IdentityProviders.pipe(
              Effect.map(Redacted.value),
              Effect.map(Struct.get(Constants.ENTRA_ID)),
            );

          const client = new ConfidentialClientApplication({
            auth: {
              clientId,
              clientSecret,
              authority: `https://login.microsoftonline.com/${externalTenantId}`,
            },
          });

          const accessToken = Effect.tryPromise({
            try: () =>
              client.acquireTokenByClientCredential({
                scopes: ["https://graph.microsoft.com/.default"],
              }),
            catch: (cause) => new ClientError({ cause }),
          }).pipe(
            Effect.flatMap((result) =>
              result === null
                ? Effect.fail(
                    new ClientError({
                      cause: new globalThis.Error(
                        "Missing authentication result",
                      ),
                    }),
                  )
                : Effect.succeed(result.accessToken),
            ),
          );

          return { accessToken } as const;
        }),
    },
  ) {}
}
