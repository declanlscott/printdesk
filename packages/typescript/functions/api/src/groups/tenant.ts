import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Crypto from "@printdesk/core/crypto/layer";
import * as IdentityProvidersRepository from "@printdesk/core/identity/providers-repository/layer";
import * as LicensesRepository from "@printdesk/core/licenses/repository/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import { TenantsRegistry } from "@printdesk/core/tenants/registry";
import { layer as tenantsRegistryLayer } from "@printdesk/core/tenants/registry/layer";
import * as TenantsRepository from "@printdesk/core/tenants/repository/layer";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import * as HttpServerError from "effect/unstable/http/HttpServerError";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { openauthLayer } from "../lib/auth";
import { databaseLayer, dynamoLayer } from "../lib/database";
import { actorMiddleware } from "../middleware/actor";

export const baseTenantGroupLayer = HttpApiBuilder.group(
  Api,
  "tenant",
  Effect.fn(function* (handlers) {
    const { register } = yield* TenantsRegistry;

    return handlers.handle(
      "registration",
      Effect.fn("Api.Tenant.registration")(({ payload }) =>
        register(payload).pipe(
          Effect.tap(({ clientTokens }) =>
            HttpEffect.appendPreResponseHandler((request, response) =>
              response.pipe(
                HttpServerResponse.setCookies([
                  [
                    Constants.COOKIE_NAMES.ACCESS_TOKEN,
                    clientTokens.access.pipe(Redacted.value),
                    Constants.COOKIE_OPTIONS,
                  ],
                  [
                    Constants.COOKIE_NAMES.REFRESH_TOKEN,
                    clientTokens.refresh.pipe(Redacted.value),
                    Constants.COOKIE_OPTIONS,
                  ],
                ]),
                Effect.mapError(
                  (error) =>
                    new HttpServerError.HttpServerError({
                      reason: new HttpServerError.ResponseError({
                        request,
                        response,
                        description: error.message,
                        cause: error,
                      }),
                    }),
                ),
              ),
            ),
          ),
          Effect.map(Struct.pick(["deploymentId"])),
          Effect.tapError(Effect.logError),
          Effect.catchTags({
            EffectDrizzleQueryError: () => new HttpApiError.InternalServerError(),
            SqlError: () => new HttpApiError.InternalServerError(),
            DsqlError: () => new HttpApiError.InternalServerError(),
            PlatformError: () => new HttpApiError.InternalServerError(),
            SchemaError: () => new HttpApiError.InternalServerError(),
          }),
        ),
      ),
    );
  }),
);

export const tenantGroupLayer = baseTenantGroupLayer.pipe(
  Layer.provide([actorMiddleware.layer, tenantsRegistryLayer]),
  Layer.provide([
    ActorLayerMap.layer,
    LicensesRepository.layer,
    ClientsRepository.layer,
    Crypto.layer,
    IdentityProvidersRepository.layer,
    openauthLayer,
    TenantsRepository.layer,
  ]),
  Layer.provide(SyncQueryBuilder.layer),
  Layer.provide([databaseLayer, dynamoLayer, SstResource.layer]),
);
