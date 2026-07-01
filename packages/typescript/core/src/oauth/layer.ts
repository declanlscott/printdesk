import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { Oauth } from ".";
import { ClientsContract } from "../clients/contract";
import { ClientsRepository } from "../clients/repository";
import { Crypto } from "../crypto";
import { IdentityProvidersContract } from "../identity/contract";
import { IdentityProvidersRepository } from "../identity/providers-repository";
import { TenantsContract } from "../tenants/contract";
import { UsersContract } from "../users/contract";
import { OauthContract } from "./contract";

import type {
  ClientCredentialsProviderConfig,
  ClientCredentialsProviderVerifyResult,
} from "./client-credentials";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const clientsRepository = yield* ClientsRepository;
  const crypto = yield* Crypto;
  const identityProvidersRepository = yield* IdentityProvidersRepository;

  const handleUser = Effect.fn("Oauth.handleUser")(function* (
    idpKind: IdentityProvidersContract.Kind,
    idpTenantId: IdentityProvidersContract.AccessToken["tenantId"],
    idpUser: IdentityProvidersContract.User,
  ) {
    const { tenant, user } = yield* identityProvidersRepository
      .findWithTenantAndUserByExternalIds(idpKind, idpTenantId, idpUser.externalId)
      .pipe(
        Effect.catchTag(
          "NoSuchElementError",
          () =>
            new OauthContract.AccessDeniedError({
              reason: new IdentityProvidersContract.NotFoundError({
                kind: idpKind,
                externalTenantId: idpTenantId,
              }),
            }),
        ),
      );

    if (tenant.status !== "active")
      return yield* new OauthContract.AccessDeniedError({
        reason: new TenantsContract.InactiveTenantError({ status: tenant.status }),
      });

    if (!user)
      return yield* new OauthContract.AccessDeniedError({
        reason: new UsersContract.NotFoundError({
          id: { _tag: "external", value: idpUser.externalId },
        }),
      });

    return new OauthContract.UserSubject(Struct.pick(user, ["id", "tenantId", "role"]));
  });

  const verifyClient = Effect.fn("Oauth.verifyClient")(function* (
    ...[credentials, requestedScopes]: Parameters<ClientCredentialsProviderConfig["verify"]>
  ) {
    const client = yield* clientsRepository.findActiveById(credentials.id).pipe(
      Effect.catchTag(
        "NoSuchElementError",
        () =>
          new OauthContract.InvalidClientError({
            id: credentials.id,
            reason: new ClientsContract.NotFoundError({ id: credentials.id }),
          }),
      ),
    );

    yield* crypto
      .verifySecret(credentials.secret, client.secretHash)
      .pipe(
        Effect.catchTag(
          "InvalidSecretError",
          (reason) => new OauthContract.InvalidClientError({ id: client.id, reason }),
        ),
      );

    if (requestedScopes && requestedScopes.length > 0) {
      const invalidScopes = Array.filter(
        requestedScopes,
        (scope) => !client.scopes.includes(scope),
      );

      if (invalidScopes.length > 0)
        return yield* new OauthContract.InvalidScopeError({ scopes: invalidScopes });

      return {
        role: client.role,
        scopes: requestedScopes,
        tenantId: client.tenantId,
      } satisfies ClientCredentialsProviderVerifyResult;
    }

    return Struct.pick(client, [
      "role",
      "scopes",
      "tenantId",
    ]) satisfies ClientCredentialsProviderVerifyResult;
  });

  return { handleUser, verifyClient } as const;
});

export const layer = makeService.pipe(Layer.effect(Oauth.Oauth));
