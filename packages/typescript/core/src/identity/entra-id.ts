import { ClientSecretCredential } from "@azure/identity";
import { AzureIdentityAuthenticationProvider } from "@microsoft/kiota-authentication-azure";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { SstResource } from "../sst/resource";
import { Constants } from "../utils/constants";

import type { AccessToken } from "@azure/identity";
import type { IdentityProvidersContract } from "./contract";

export namespace EntraId {
  export class AuthProviderError extends Schema.TaggedError<AuthProviderError>()(
    "EntraIdAuthProviderError",
    { cause: Schema.Defect() },
  ) {}

  // @effect-leakable-service
  export class AuthProvider extends Context.Service<
    AuthProvider,
    AzureIdentityAuthenticationProvider
  >()("@printdesk/core/identity/entra-id/AuthProvider") {
    public static readonly fromAccessToken = Effect.fn((accessToken: AccessToken) =>
      Effect.try({
        try: () => new AzureIdentityAuthenticationProvider({ getToken: async () => accessToken }),
        catch: (cause) => new AuthProviderError({ cause }),
      }),
    );
    public static readonly fromClientCredentials = Effect.fn(function* (
      tenantId: IdentityProvidersContract.ExternalId,
    ) {
      const { clientId, clientSecret } = yield* SstResource.useSync((resource) =>
        resource.IdentityProviders.pipe(Redacted.value, Struct.get(Constants.ENTRA_ID)),
      );

      const credential = yield* Effect.try({
        try: () => new ClientSecretCredential(tenantId, clientId, clientSecret),
        catch: (cause) => new AuthProviderError({ cause }),
      });

      return yield* Effect.try({
        try: () => new AzureIdentityAuthenticationProvider(credential),
        catch: (cause) => new AuthProviderError({ cause }),
      });
    });

    public static readonly layerFromAccessToken = (
      ...args: Parameters<typeof this.fromAccessToken>
    ) => this.fromAccessToken(...args).pipe(Layer.effect(this), Layer.fresh);

    public static readonly layerFromClientCredentials = (
      ...args: Parameters<typeof this.fromClientCredentials>
    ) => this.fromClientCredentials(...args).pipe(Layer.effect(this), Layer.fresh);
  }
}
