import { ClientSecretCredential } from "@azure/identity";
import { AzureIdentityAuthenticationProvider } from "@microsoft/kiota-authentication-azure";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { SstResource } from "../sst/resource";
import { Constants } from "../utils/constants";

import type { IdentityProvidersContract } from "./contract";

export namespace EntraId {
  export class CredentialError extends Schema.TaggedErrorClass<CredentialError>()(
    "EntraIdCredentialError",
    { cause: Schema.Defect() },
  ) {}

  export class AuthProviderError extends Schema.TaggedErrorClass<AuthProviderError>()(
    "EntraIdAuthProviderError",
    { cause: Schema.Defect() },
  ) {}

  // @effect-leakable-service
  export class AuthProvider extends Context.Service<AuthProvider>()(
    "@printdesk/core/identity/entra-id/AuthProvider",
    {
      make: Effect.fn(function* (externalTenantId: IdentityProvidersContract.ExternalTenantId) {
        const { clientId, clientSecret } = yield* SstResource.useSync((resource) =>
          resource.IdentityProviders.pipe(Redacted.value, Struct.get(Constants.ENTRA_ID)),
        );

        const credential = yield* Effect.try({
          try: () => new ClientSecretCredential(externalTenantId, clientId, clientSecret),
          catch: (cause) => new CredentialError({ cause }),
        });

        const provider = yield* Effect.try({
          try: () => new AzureIdentityAuthenticationProvider(credential),
          catch: (cause) => new AuthProviderError({ cause }),
        });

        return { externalTenantId, provider } as const;
      }),
    },
  ) {
    public static readonly layer = (...args: Parameters<typeof this.make>) =>
      this.make(...args).pipe(Layer.effect(this), Layer.fresh);
  }

  export class AuthProviderLayerMap extends LayerMap.Service<AuthProviderLayerMap>()(
    "@printdesk/core/identity/entra-id/AuthProviderLayerMap",
    {
      idleTimeToLive: Duration.minutes(15),
      dependencies: [SstResource.layer],
      lookup: AuthProvider.layer,
    },
  ) {}
}
