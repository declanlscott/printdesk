import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { Config } from ".";
import { Actor } from "../actors";
import { Appconfig } from "../aws/appconfig";
import { AppconfigAgent } from "../aws/appconfig/agent";
import { OauthContract } from "../oauth/contract";
import { PapercutContract } from "../papercut/contract";
import { SstResource } from "../sst/resource";
import { tenantTemplate } from "../utils";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const appconfig = yield* Appconfig;
  const agent = yield* AppconfigAgent;
  const resource = yield* SstResource;

  const apiClientCredentialsProfileIdEffect = Actor.use(Struct.get("assertPrivate")).pipe(
    Effect.map(({ tenantId }) =>
      tenantTemplate(
        resource.ApiClientCredentialsConfigurationProfileTemplate.pipe(Redacted.value).name,
        tenantId,
      ),
    ),
  );

  const papercutApiAuthTokenProfileIdEffect = Actor.use(Struct.get("assertPrivate")).pipe(
    Effect.map(({ tenantId }) =>
      tenantTemplate(
        resource.PapercutApiAuthTokenConfigurationProfileTemplate.pipe(Redacted.value).name,
        tenantId,
      ),
    ),
  );

  const setApiClientCredentials = Effect.fn("Config.setApiClientCredentials")(
    (value: OauthContract.ClientCredentials) =>
      apiClientCredentialsProfileIdEffect.pipe(
        Effect.andThen((profileId) =>
          appconfig.publish({
            profileId,
            Codec: OauthContract.ClientCredentials,
            deploymentStrategyId: resource.ApiClientCredentialsDeploymentStrategy.pipe(
              Redacted.value,
            ).id,
            value,
          }),
        ),
      ),
  );

  const getApiClientCredentials = apiClientCredentialsProfileIdEffect.pipe(
    Effect.andThen((profileId) =>
      agent.getConfiguration(profileId, OauthContract.ClientCredentials),
    ),
    Effect.withSpan("Config.getApiClientCredentials"),
  );

  const setPapercutApiAuthToken = Effect.fn("Config.setPapercutApiAuthToken")(
    (value: PapercutContract.ApiAuthToken) =>
      apiClientCredentialsProfileIdEffect.pipe(
        Effect.andThen((profileId) =>
          appconfig.publish({
            profileId,
            Codec: PapercutContract.ApiAuthToken,
            deploymentStrategyId: resource.PapercutApiAuthTokenDeploymentStrategy.pipe(
              Redacted.value,
            ).id,
            value,
          }),
        ),
      ),
  );

  const getPapercutApiAuthToken = papercutApiAuthTokenProfileIdEffect.pipe(
    Effect.andThen((profileId) => agent.getConfiguration(profileId, PapercutContract.ApiAuthToken)),
    Effect.withSpan("Config.getPapercutApiAuthToken"),
  );

  return {
    setApiClientCredentials,
    getApiClientCredentials,
    setPapercutApiAuthToken,
    getPapercutApiAuthToken,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(Config));
