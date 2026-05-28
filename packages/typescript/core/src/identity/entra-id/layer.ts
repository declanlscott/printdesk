import { ConfidentialClientApplication } from "@azure/msal-node";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { EntraId, EntraIdError } from ".";
import { SstResource } from "../../sst/resource";
import { Constants } from "../../utils/constants";

import type { IdentityProvidersContract } from "../contract";

export type ServiceShape = Effect.Success<ReturnType<typeof makeService>>;

export const makeService = Effect.fn(function* (
  externalTenantId: (typeof IdentityProvidersContract.Table.Model.Type)["externalTenantId"],
) {
  const { clientId, clientSecret } = yield* SstResource.useSync((resource) =>
    resource.IdentityProviders.pipe(Redacted.value, Struct.get(Constants.ENTRA_ID)),
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
    catch: (cause) => new EntraIdError({ cause }),
  }).pipe(
    Effect.flatMap((result) =>
      result === null
        ? Effect.fail(
            new EntraIdError({
              cause: new globalThis.Error("Missing authentication result"),
            }),
          )
        : Effect.succeed(result.accessToken),
    ),
  );

  return { accessToken } as const;
});

export const layer = (...args: Parameters<typeof makeService>) =>
  makeService(...args).pipe(Layer.effect(EntraId));
