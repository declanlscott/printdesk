import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { Appconfig } from "@printdesk/core/aws/appconfig";
import { AppconfigAgent } from "@printdesk/core/aws/appconfig/agent";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import { Cloudflare } from "@printdesk/core/cloudflare";
import * as Config from "@printdesk/core/config/layer";
import * as Crypto from "@printdesk/core/crypto/layer";
import * as IdentityProvidersRepository from "@printdesk/core/identity/providers-repository/layer";
import * as LicensesRepository from "@printdesk/core/licenses/repository/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as SyncQueryBuilder from "@printdesk/core/sync/query-builder/layer";
import { TenantsProvisioner } from "@printdesk/core/tenants/provisioner";
import { layer as tenantsProvisionerLayer } from "@printdesk/core/tenants/provisioner/layer";
import * as TenantsRepository from "@printdesk/core/tenants/repository/layer";
import { Constants } from "@printdesk/core/utils/constants";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import * as HttpServerError from "effect/unstable/http/HttpServerError";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { openauthLayer } from "../lib/auth";
import { databaseLayer, dynamoLayer } from "../lib/database";
import { actorMiddleware } from "../middleware/actor";
import { appconfigAwsCredentialIdentityLayer } from "../middleware/aws-credential-identity/appconfig";

export const baseTenantRegistrationGroupLayer = HttpApiBuilder.group(
  Api,
  "TenantRegistration",
  Effect.fn(function* (handlers) {
    const { register } = yield* TenantsProvisioner;

    return handlers.handle(
      "register",
      Effect.fn("Api.TenantRegistration.register")(({ payload }) =>
        register(payload).pipe(
          Effect.tap(({ setupClientTokens }) =>
            HttpEffect.appendPreResponseHandler((request, response) =>
              response.pipe(
                HttpServerResponse.setCookies([
                  [
                    Constants.COOKIE_NAMES.ACCESS_TOKEN,
                    setupClientTokens.access.pipe(Redacted.value),
                    Constants.COOKIE_OPTIONS,
                  ],
                  [
                    Constants.COOKIE_NAMES.REFRESH_TOKEN,
                    setupClientTokens.refresh.pipe(Redacted.value),
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
          Effect.mapError((error) =>
            HttpServerRespondable.isRespondable(error)
              ? error
              : new HttpApiError.InternalServerError(),
          ),
        ),
      ),
    );
  }),
);

export const tenantRegistrationGroupLayer = baseTenantRegistrationGroupLayer.pipe(
  Layer.provide([actorMiddleware.layer, tenantsProvisionerLayer]),
  Layer.provide([
    ActorLayerMap.layer,
    ClientsRepository.layer,
    Cloudflare.layer,
    Config.layer,
    Crypto.layer,
    LicensesRepository.layer,
    IdentityProvidersRepository.layer,
    openauthLayer,
    TenantsRepository.layer,
  ]),
  Layer.provide([Appconfig.layer, AppconfigAgent.layer, NodeCrypto.layer, SyncQueryBuilder.layer]),
  Layer.provide([databaseLayer, dynamoLayer, FetchHttpClient.layer, SstResource.layer]),
);

export const baseTenantSetupGroupLayer = HttpApiBuilder.group(
  Api,
  "TenantSetup",
  Effect.fn(function* (handlers) {
    const { setup } = yield* TenantsProvisioner;

    return handlers.handle(
      "setup",
      Effect.fn("Api.TenantSetup.setup")(({ payload }) =>
        setup(payload).pipe(
          Effect.mapError((error) =>
            HttpServerRespondable.isRespondable(error)
              ? error
              : new HttpApiError.InternalServerError(),
          ),
        ),
      ),
    );
  }),
);

export const tenantSetupGroupLayer = baseTenantSetupGroupLayer.pipe(
  Layer.provide([appconfigAwsCredentialIdentityLayer, tenantsProvisionerLayer]),
  Layer.provide([
    ClientsRepository.layer,
    Cloudflare.layer,
    Config.layer,
    Crypto.layer,
    LicensesRepository.layer,
    IdentityProvidersRepository.layer,
    openauthLayer,
    TenantsRepository.layer,
  ]),
  Layer.provide([Appconfig.layer, AppconfigAgent.layer, NodeCrypto.layer, SyncQueryBuilder.layer]),
  Layer.provide([databaseLayer, dynamoLayer, FetchHttpClient.layer, SstResource.layer]),
);
