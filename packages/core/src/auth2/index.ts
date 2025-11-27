import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { ConfidentialClientApplication } from "@azure/msal-node";
import { Oauth2Provider } from "@openauthjs/openauth/provider/oauth2";
import { decodeJWT } from "@oslojs/jwt";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { IdentityProviders } from "../identity-providers2";
import { Sst } from "../sst";
import { Users } from "../users2";
import { Constants } from "../utils/constants";
import { delimitToken, splitToken } from "../utils2";
import { AuthContract } from "./contract";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/provider/oauth2";
import type { IdentityProvidersContract } from "../identity-providers2/contract";
import type { TenantsContract } from "../tenants2/contracts";

export namespace Auth {
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
            const resource = yield* Sst.Resource;

            const { clientId, clientSecret } =
              yield* resource.IdentityProviders.pipe(
                Effect.map(Struct.get(Constants.ENTRA_ID)),
                Effect.map(
                  Struct.evolve({
                    clientId: Redacted.make<string>,
                    clientSecret: Redacted.make<string>,
                  }),
                ),
              );

            const client = new ConfidentialClientApplication({
              auth: {
                clientId: Redacted.value(clientId),
                clientSecret: Redacted.value(clientSecret),
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

  export namespace Google {
    // TODO
  }

  export class Auth extends Effect.Service<Auth>()(
    "@printdesk/core/auth/Auth",
    {
      accessors: true,
      dependencies: [
        Sst.Resource.layer,
        IdentityProviders.Repository.Default,
        Users.Repository.Default,
      ],
      effect: Effect.gen(function* () {
        const resource = yield* Sst.Resource;
        const identityProvidersRepository = yield* IdentityProviders.Repository;
        const usersRepository = yield* Users.Repository;

        const providers = yield* resource.IdentityProviders.pipe(
          Effect.map((providers) => ({
            [Constants.ENTRA_ID]: EntraId.provider({
              tenant: "organizations",
              clientID: providers[Constants.ENTRA_ID].clientId,
              clientSecret: providers[Constants.ENTRA_ID].clientSecret,
              scopes: [...Constants.ENTRA_ID_OAUTH_SCOPES],
            }),
          })),
        );

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
                        Struct.pick(admin, "id", "tenantId"),
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
                      Struct.pick(user, "id", "tenantId"),
                    );
                  }),
                ),
                Match.when(Match.is("active"), () =>
                  Effect.gen(function* () {
                    if (!user)
                      return yield* Effect.fail(
                        new Cause.NoSuchElementException(),
                      );

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
                      Struct.pick(user, "id", "tenantId"),
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
    },
  ) {}

  export class Session extends Context.Tag("@printdesk/core/auth/Session")<
    Session,
    AuthContract.Session
  >() {}

  export class CryptoError extends Data.TaggedError("CryptoError")<{
    readonly cause: unknown;
  }> {}

  export class Crypto extends Effect.Service<Crypto>()(
    "@printdesk/core/auth/Crypto",
    {
      accessors: true,
      sync: () => {
        const generateToken = (size = 32) =>
          Effect.try({
            try: () => randomBytes(size).toString("hex"),
            catch: (cause) => new CryptoError({ cause }),
          });

        const deriveKeyFromSecret = (secret: string, salt: string) =>
          Effect.tryPromise({
            try: () =>
              new Promise<string>((resolve, reject) =>
                scrypt(secret.normalize(), salt, 64, (error, derivedKey) =>
                  error ? reject(error) : resolve(derivedKey.toString("hex")),
                ),
              ),
            catch: (cause) => new CryptoError({ cause }),
          });

        const hashSecret = (secret: string) =>
          Effect.gen(function* () {
            const salt = yield* generateToken(16);

            const derivedKey = yield* deriveKeyFromSecret(secret, salt);

            return delimitToken(salt, derivedKey);
          });

        const verifySecret = (secret: string, hash: string) =>
          Effect.gen(function* () {
            const tokens = splitToken(hash);
            if (tokens.length !== 2)
              return yield* Effect.fail(
                new CryptoError({
                  cause: new globalThis.Error("Invalid hash"),
                }),
              );
            const [salt, storedKey] = tokens;

            const derivedKey = yield* deriveKeyFromSecret(secret, salt);

            const storedKeyBuffer = yield* Effect.try({
              try: () => Buffer.from(storedKey, "hex"),
              catch: (cause) => new CryptoError({ cause }),
            });

            const derivedKeyBuffer = yield* Effect.try({
              try: () => Buffer.from(derivedKey, "hex"),
              catch: (cause) => new CryptoError({ cause }),
            });

            return yield* Effect.try({
              try: () => timingSafeEqual(storedKeyBuffer, derivedKeyBuffer),
              catch: (cause) => new CryptoError({ cause }),
            });
          });

        const decodeJwt = (jwt: string) =>
          Effect.try({
            try: () => decodeJWT(jwt),
            catch: (cause) => new CryptoError({ cause }),
          });

        return {
          generateToken,
          deriveKeyFromSecret,
          hashSecret,
          verifySecret,
          decodeJwt,
        } as const;
      },
    },
  ) {}
}
