import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Struct from "effect/Struct";

import { Oauth } from ".";
import { ClientsRepository } from "../clients/repository";
import { Crypto } from "../crypto";
import { IdentityProvidersRepository } from "../identity/providers-repository";
import { UsersRepository } from "../users/repository";
import { OauthContract } from "./contract";

import type { IdentityProvidersContract } from "../identity/contract";
import type {
  ClientCredentialsProviderConfig,
  ClientCredentialsProviderVerifyResult,
} from "./client-credentials";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const clientsRepository = yield* ClientsRepository;
  const crypto = yield* Crypto;
  const identityProvidersRepository = yield* IdentityProvidersRepository;
  const usersRepository = yield* UsersRepository;

  const handleUser = Effect.fn("Oauth.handleUser")(function* (
    idpKind: IdentityProvidersContract.Kind,
    idpTenantId: IdentityProvidersContract.AccessToken["tenantId"],
    idpUser: IdentityProvidersContract.User,
  ) {
    const { identityProvider, tenant, user } =
      yield* identityProvidersRepository.findWithTenantAndUserByExternalIds(
        idpKind,
        idpTenantId,
        idpUser.id,
      );

    return yield* Match.value(tenant.status).pipe(
      Match.when(Match.is("setup"), () =>
        Effect.gen(function* () {
          if (!user) {
            const admin = yield* usersRepository.create({
              origin: "internal",
              username: idpUser.username,
              externalId: idpUser.id,
              identityProviderId: identityProvider.id,
              role: "administrator",
              name: idpUser.name,
              email: idpUser.email,
              tenantId: identityProvider.tenantId,
            });

            return new OauthContract.UserSubject(Struct.pick(admin, ["id", "tenantId", "role"]));
          }

          if (
            idpUser.username !== user.username ||
            idpUser.name !== user.name ||
            idpUser.email !== user.email
          )
            yield* usersRepository.updateById(
              user.id,
              {
                username: idpUser.username,
                name: idpUser.name,
                email: idpUser.email,
              },
              user.tenantId,
            );

          return new OauthContract.UserSubject(Struct.pick(user, ["id", "tenantId", "role"]));
        }),
      ),
      Match.when(Match.is("active"), () =>
        Effect.gen(function* () {
          if (!user) return yield* new Cause.NoSuchElementError();

          if (
            idpUser.username !== user.username ||
            idpUser.name !== user.name ||
            idpUser.email !== user.email
          )
            yield* usersRepository.updateById(
              user.id,
              {
                username: idpUser.username,
                name: idpUser.name,
                email: idpUser.email,
              },
              user.tenantId,
            );

          return new OauthContract.UserSubject(Struct.pick(user, ["id", "tenantId", "role"]));
        }),
      ),
      Match.when(Match.is("suspended"), () =>
        Effect.fail(
          new OauthContract.TenantSuspendedError({
            tenantId: identityProvider.tenantId,
          }),
        ),
      ),
      Match.exhaustive,
    );
  });

  const verifyClient = Effect.fn("Oauth.verifyClient")(function* (
    ...[credentials, requestedScopes]: Parameters<ClientCredentialsProviderConfig["verify"]>
  ) {
    const client = yield* clientsRepository.findActiveById(credentials.id);

    yield* crypto.verifySecret(credentials.secret, client.secretHash);

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

export const layer = makeService.pipe(Layer.effect(Oauth));
