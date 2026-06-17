import { DynamoDBDocument } from "@effect-aws/dynamodb";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as SqlError from "effect/unstable/sql/SqlError";

import { TenantsRegistry } from ".";
import { AccessControl } from "../../access-control";
import { Actor } from "../../actors";
import { ClientsRepository } from "../../clients/repository";
import { Crypto } from "../../crypto";
import { Database } from "../../database";
import { IdentityProvidersRepository } from "../../identity/providers-repository";
import { InfraContract } from "../../infra/contract";
import { LicensesContract } from "../../licenses/contract";
import { LicensesRepository } from "../../licenses/repository";
import { Oauth } from "../../oauth/client";
import { PapercutContract } from "../../papercut/contract";
import { SstResource } from "../../sst/resource";
import { generateEntityId, TenantId } from "../../utils";
import { Constants } from "../../utils/constants";
import { TenantsContract } from "../contract";
import { TenantsRepository } from "../repository";
import { tenantsTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const licensesRepository = yield* LicensesRepository;
  const tenantsRepository = yield* TenantsRepository;
  const identityProvidersRepository = yield* IdentityProvidersRepository;
  const clientsRepository = yield* ClientsRepository;

  const ddb = yield* DynamoDBDocument;
  const ddbTableName = yield* SstResource.useSync(Struct.get("Dynamo")).pipe(
    Effect.map(Redacted.value),
    Effect.map(Struct.get("name")),
  );

  const crypto = yield* Crypto;
  const openauth = yield* Oauth.Openauth;

  const register = Effect.fn("Tenants.Registry.register")(function* (
    registration: TenantsContract.Registration,
  ) {
    const tenantId = yield* generateEntityId.pipe(Effect.map(TenantId.make));
    const deploymentId = yield* generateEntityId;

    const clientSecret = yield* crypto.generateToken();
    const clientSecretHash = yield* clientSecret.pipe(crypto.hashSecret);

    const infraInputItem = yield* registration.papercutConfig.pipe(
      Option.match({
        onSome: PapercutContract.EnabledConfig.makeEffect,
        onNone: PapercutContract.DisabledConfig.makeEffect,
      }),
      Effect.flatMap(PapercutContract.Config.makeEffect),
      Effect.flatMap((papercutConfig) =>
        InfraContract.InputItem.makeEffect({
          [Constants.DYNAMO_KEYS.PK]: tenantId,
          [Constants.DYNAMO_KEYS.GSI1_PK]: { tenantId, deploymentId },
          papercutConfig,
        }),
      ),
      Effect.flatMap(Schema.encodeEffect(InfraContract.InputItem)),
    );

    const clientTokens = yield* db.withTransaction(
      Effect.fn(function* () {
        const { tenant } = yield* licensesRepository
          .findByKeyWithTenant(registration.tenant.licenseKey)
          .pipe(
            Effect.catchTag(
              "NoSuchElementError",
              () =>
                new LicensesContract.NoSuchLicenseError({ key: registration.tenant.licenseKey }),
            ),
          );

        if (tenant)
          yield* Actor.pipe(
            Effect.flatMap(Struct.get("assertClient")),
            Effect.filterOrFail(
              (client) => client.tenantId === tenant.tenantId && tenant.status === "setup",
              () =>
                new LicensesContract.LicenseKeyConflictError({
                  key: registration.tenant.licenseKey,
                }),
            ),
            Effect.flatMap((client) =>
              Effect.all(
                [
                  clientsRepository.deleteById(client.id, tenant.tenantId),
                  identityProvidersRepository.deleteByTenantId(tenant.tenantId),
                  tenantsRepository.deleteById(tenant.id),
                  InfraContract.InputKey.makeEffect({
                    [Constants.DYNAMO_KEYS.PK]: tenant.tenantId,
                  }).pipe(
                    Effect.flatMap(Schema.encodeEffect(InfraContract.InputKey)),
                    Effect.flatMap((Key) =>
                      ddb
                        .delete({ TableName: ddbTableName, Key })
                        .pipe(
                          Effect.mapError(
                            (error) => new InfraContract.InputError({ cause: error }),
                          ),
                        ),
                    ),
                  ),
                ],
                { discard: true },
              ).pipe(
                AccessControl.enforce(
                  AccessControl.every(
                    AccessControl.clientPermissionPolicy("clients:delete"),
                    AccessControl.clientPermissionPolicy("identity_providers:delete"),
                    AccessControl.clientPermissionPolicy("tenants:delete"),
                    AccessControl.clientPermissionPolicy("infra_input:delete"),
                  ),
                ),
              ),
            ),
          );

        yield* tenantsRepository
          .create({ ...registration.tenant, id: tenantId, tenantId })
          .pipe(
            Effect.catchReason("SqlError", "UniqueViolation", (reason) =>
              Effect.fail(
                reason.constraint === tenantsTable.slug.name
                  ? new TenantsContract.TenantSlugConflictError({ slug: registration.tenant.slug })
                  : new SqlError.SqlError({ reason }),
              ),
            ),
          );

        yield* identityProvidersRepository.createMany(
          Array.map(registration.identityProviders, Struct.assign({ tenantId })),
        );

        const clientTokens = yield* clientsRepository
          .create({
            name: "Setup Client",
            secretHash: clientSecretHash,
            role: "setup",
            scopes: ["setup"],
            tenantId,
          })
          .pipe(
            Effect.flatMap(({ id }) => openauth.clientCredentials({ id, secret: clientSecret })),
            Effect.map(Struct.get("tokens")),
          );

        yield* ddb
          .put({ TableName: ddbTableName, Item: infraInputItem })
          .pipe(Effect.mapError((error) => new InfraContract.InputError({ cause: error })));

        return clientTokens;
      }),
    );

    return { clientTokens, deploymentId };
  });

  return { register } as const;
});

export const layer = makeService.pipe(Layer.effect(TenantsRegistry));
