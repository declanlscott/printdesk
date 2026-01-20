import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { EntraId, IdentityProviders } from "../identity";
import { Sst } from "../sst";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { AuthContract } from "./contracts";

import type { IdentityProvidersContract } from "../identity/contract";
import type { TenantsContract } from "../tenants/contracts";

export class Auth extends Effect.Service<Auth>()("@printdesk/core/auth/Auth", {
  accessors: true,
  dependencies: [
    Sst.Resource.layer,
    IdentityProviders.Repository.Default,
    Users.Repository.Default,
  ],
  effect: Effect.gen(function* () {
    const providers = yield* Sst.Resource.IdentityProviders.pipe(
      Effect.map(Redacted.value),
      Effect.map((providers) => ({
        [Constants.ENTRA_ID]: EntraId.oauthProvider({
          tenant: "organizations",
          clientID: providers[Constants.ENTRA_ID].clientId,
          clientSecret: providers[Constants.ENTRA_ID].clientSecret,
          scopes: [...Constants.ENTRA_ID_OAUTH_SCOPES],
        }),
      })),
    );
    const identityProvidersRepository = yield* IdentityProviders.Repository;
    const usersRepository = yield* Users.Repository;

    const handleUser = Effect.fn("Auth.handleUserSubject")(
      (
        idpKind: IdentityProvidersContract.Kind,
        idpTenantId: IdentityProvidersContract.AccessToken["tenantId"],
        idpUser: IdentityProvidersContract.User,
      ) =>
        Effect.gen(function* () {
          const { identityProvider, tenant, user } =
            yield* identityProvidersRepository.findWithTenantAndUserByExternalIds(
              idpKind,
              idpTenantId,
              idpUser.id,
            );

          const match = Match.type<TenantsContract.Status>().pipe(
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

                  return new AuthContract.UserSubject(
                    Struct.pick(admin, "id", "tenantId", "role"),
                  );
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

                return new AuthContract.UserSubject(
                  Struct.pick(user, "id", "tenantId", "role"),
                );
              }),
            ),
            Match.when(Match.is("active"), () =>
              Effect.gen(function* () {
                if (!user) return yield* new Cause.NoSuchElementException();

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

                return new AuthContract.UserSubject(
                  Struct.pick(user, "id", "tenantId", "role"),
                );
              }),
            ),
            Match.when(Match.is("suspended"), () =>
              Effect.fail(
                new AuthContract.TenantSuspendedError({
                  tenantId: identityProvider.tenantId,
                }),
              ),
            ),
            Match.exhaustive,
          );

          return yield* match(tenant.status);
        }),
    );

    return { providers, handleUser } as const;
  }),
}) {}
