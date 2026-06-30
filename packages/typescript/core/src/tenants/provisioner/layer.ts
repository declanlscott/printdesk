import { DynamoDBDocument } from "@effect-aws/dynamodb";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as SqlError from "effect/unstable/sql/SqlError";

import { TenantsProvisioner } from ".";
import { AccessControl } from "../../access-control";
import { Actor } from "../../actors";
import { ClientsRepository } from "../../clients/repository";
import { Cloudflare } from "../../cloudflare";
import { Config } from "../../config";
import { Crypto } from "../../crypto";
import { Database } from "../../database";
import { IdentityProvidersRepository } from "../../identity/providers-repository";
import { InfraContract } from "../../infra/contract";
import { LicensesContract } from "../../licenses/contract";
import { LicensesRepository } from "../../licenses/repository";
import { Openauth } from "../../oauth/openauth";
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
  const openauth = yield* Openauth.Openauth;

  const cloudflare = yield* Cloudflare;

  const config = yield* Config;

  const register = Effect.fn("Tenants.Provisioner.register")(function* (
    payload: TenantsContract.RegistrationPayload,
  ) {
    const tenantId = yield* generateEntityId.pipe(Effect.map(TenantId.make));
    const deploymentId = yield* generateEntityId;

    const setupClientSecret = yield* crypto.generateToken();
    const setupClientSecretHash = yield* setupClientSecret.pipe(crypto.hashSecret);

    const infraInputItem = yield* payload.papercutConfig.pipe(
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

    const setupClientTokens = yield* db.withTransaction(
      Effect.fn(function* () {
        yield* licensesRepository.findByKeyWithTenant(payload.tenant.licenseKey).pipe(
          Effect.catchTag(
            "NoSuchElementError",
            () => new LicensesContract.NoSuchLicenseError({ key: payload.tenant.licenseKey }),
          ),
          Effect.map(Struct.get("tenant")),
          Effect.filterOrElse(Predicate.isNull, (tenant) =>
            Effect.all(
              [
                clientsRepository.deleteByTenantId(tenant.tenantId),
                identityProvidersRepository.deleteByTenantId(tenant.tenantId),
                tenantsRepository.deleteById(tenant.id),
              ],
              { concurrency: "unbounded" },
            ).pipe(
              Effect.andThen(
                InfraContract.InputKey.makeEffect({ [Constants.DYNAMO_KEYS.PK]: tenant.tenantId }),
              ),
              Effect.andThen((Key) =>
                ddb
                  .delete({ TableName: ddbTableName, Key })
                  .pipe(Effect.mapError((error) => new InfraContract.InputError({ cause: error }))),
              ),
              AccessControl.enforce(
                AccessControl.every(
                  AccessControl.privateActorPolicy(
                    { name: "tenants", id: tenant.id },
                    (actor) =>
                      Effect.succeed(
                        actor.tenantId === tenant.tenantId && tenant.status === "setup",
                      ).pipe(
                        Effect.filterOrFail(
                          Predicate.isTruthy,
                          () =>
                            new LicensesContract.LicenseKeyConflictError({
                              key: payload.tenant.licenseKey,
                            }),
                        ),
                      ),
                    "delete",
                  ),
                  AccessControl.permissionPolicy("clients:delete"),
                  AccessControl.permissionPolicy("identity_providers:delete"),
                  AccessControl.permissionPolicy("tenants:delete"),
                  AccessControl.permissionPolicy("infra_input:delete"),
                ),
              ),
            ),
          ),
          Effect.asVoid,
        );

        const [setupClient] = yield* Effect.all(
          [
            clientsRepository.create({
              name: "Setup Client",
              secretHash: setupClientSecretHash,
              role: "setup",
              scopes: ["setup"],
              tenantId,
            }),
            identityProvidersRepository.createMany(
              Array.map(payload.identityProviders, Struct.assign({ tenantId })),
            ),
            tenantsRepository.create({ ...payload.tenant, id: tenantId, tenantId }),
          ],
          { concurrency: "unbounded" },
        ).pipe(
          Effect.catchReason("SqlError", "UniqueViolation", (reason) =>
            Effect.fail(
              reason.constraint === tenantsTable.slug.name
                ? new TenantsContract.TenantSlugConflictError({
                    slug: payload.tenant.slug,
                  })
                : new SqlError.SqlError({ reason }),
            ),
          ),
        );

        const { tokens: setupClientTokens } = yield* openauth.clientCredentials({
          id: setupClient.id,
          secret: setupClientSecret,
        });

        yield* ddb
          .put({ TableName: ddbTableName, Item: infraInputItem })
          .pipe(Effect.mapError((error) => new InfraContract.InputError({ cause: error })));

        return setupClientTokens;
      }),
    );

    return { setupClientTokens, deploymentId } as const;
  });

  const setup = Effect.fn("Tenants.Provisioner.setup")(
    function* (payload: TenantsContract.SetupPayload) {
      const tenantId = yield* Actor.use(Struct.get("tenantId"));

      const output = yield* InfraContract.OutputSecondaryKey.makeEffect({
        [Constants.DYNAMO_KEYS.GSI1_PK]: { tenantId, deploymentId: payload.deploymentId },
      }).pipe(
        Effect.andThen((Key) => ddb.get({ TableName: ddbTableName, Key })),
        Effect.mapError((error) =>
          error._tag === "ResourceNotFoundException"
            ? new InfraContract.NotDeployedError({ deploymentId: payload.deploymentId })
            : new InfraContract.OutputError({ cause: error }),
        ),
        Effect.map(Struct.get("Item")),
        Effect.filterOrFail(
          Predicate.isNotUndefined,
          () => new InfraContract.NotDeployedError({ deploymentId: payload.deploymentId }),
        ),
        Effect.flatMap(Schema.decodeUnknownEffect(InfraContract.OutputItem)),
      );

      if (payload.papercutApiAuthToken._tag !== output.papercutApiTunnelId._tag)
        return yield* new TenantsContract.UnexpectedPapercutApiAuthTokenPayloadError();

      const papercutApiTunnelToken = yield* output.papercutApiTunnelId.pipe(
        Option.match({
          onNone: () =>
            Option.none<Effect.Success<ReturnType<typeof cloudflare.getTunnelToken>>>().pipe(
              Effect.succeed,
            ),
          onSome: (tunnelId) => cloudflare.getTunnelToken(tunnelId).pipe(Effect.map(Option.some)),
        }),
      );

      const [apiClientSecret, invoicesProcessorClientSecret, papercutSyncClientSecret] =
        yield* Effect.all(
          [crypto.generateToken(), crypto.generateToken(), crypto.generateToken()],
          { concurrency: "unbounded" },
        );
      const [apiClientSecretHash, invoicesProcessorClientSecretHash, papercutSyncClientSecretHash] =
        yield* Effect.all(
          [
            apiClientSecret.pipe(crypto.hashSecret),
            invoicesProcessorClientSecret.pipe(crypto.hashSecret),
            papercutSyncClientSecret.pipe(crypto.hashSecret),
          ],
          { concurrency: "unbounded" },
        );

      yield* db.withTransaction(() =>
        Effect.all(
          [
            clientsRepository
              .create({
                name: "API Client",
                secretHash: apiClientSecretHash,
                role: "api",
                scopes: ["api"],
                tenantId,
              })
              .pipe(
                Effect.andThen(({ id }) =>
                  config.setApiClientCredentials({ id, secret: apiClientSecret }, "fast"),
                ),
              ),
            clientsRepository
              .create({
                name: "Invoices Processor Client",
                secretHash: invoicesProcessorClientSecretHash,
                role: "invoicesProcessor",
                scopes: ["invoices-processor"],
                tenantId,
              })
              .pipe(
                Effect.andThen(({ id }) =>
                  config.setInvoicesProcessorClientCredentials(
                    { id, secret: invoicesProcessorClientSecret },
                    "fast",
                  ),
                ),
              ),
            clientsRepository
              .create({
                name: "Papercut Sync Client",
                secretHash: papercutSyncClientSecretHash,
                role: "papercutSync",
                scopes: ["papercut-sync"],
                tenantId,
              })
              .pipe(
                Effect.andThen(({ id }) =>
                  config.setPapercutSyncClientCredentials(
                    { id, secret: papercutSyncClientSecret },
                    "fast",
                  ),
                ),
              ),
          ],
          { concurrency: "unbounded", discard: true },
        ),
      );

      if (Option.isSome(payload.papercutApiAuthToken))
        yield* config.setPapercutApiAuthToken(payload.papercutApiAuthToken.value);

      return { papercutApiTunnelToken } as const;
    },
    (effect) =>
      effect.pipe(
        AccessControl.enforce(
          AccessControl.every(
            AccessControl.permissionPolicy("infra_output:read"),
            AccessControl.permissionPolicy("cloudflare_tunnel_tokens:read"),
            AccessControl.permissionPolicy("config:update"),
            AccessControl.permissionPolicy("clients:create"),
          ),
        ),
      ),
  );

  return { register, setup } as const;
});

export const layer = makeService.pipe(Layer.effect(TenantsProvisioner));
