import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
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

export type DeploymentStrategy = "fast" | "slow";

export const makeService = Effect.gen(function* () {
  const appconfig = yield* Appconfig;
  const agent = yield* AppconfigAgent;
  const resource = yield* SstResource;

  const matchDeploymentStrategyId = Match.type<DeploymentStrategy>().pipe(
    Match.when(Match.is("fast"), () =>
      resource.AppconfigAllAtOnceDeploymentStrategy.pipe(Redacted.value, Struct.get("id")),
    ),
    Match.when(Match.is("slow"), () =>
      resource.AppconfigLinear20PercentEvery6MinutesDeploymentStrategy.pipe(
        Redacted.value,
        Struct.get("id"),
      ),
    ),
    Match.exhaustive,
  );

  const apiClientCredentialsProfileIdEffect = Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(
      tenantTemplate(
        resource.ApiClientCredentialsConfigurationProfileTemplate.pipe(Redacted.value).name,
      ),
    ),
  );

  const papercutApiAuthTokenProfileIdEffect = Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(
      tenantTemplate(
        resource.PapercutApiAuthTokenConfigurationProfileTemplate.pipe(Redacted.value).name,
      ),
    ),
  );

  const papercutSyncClientCredentialsProfileIdEffect = Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(
      tenantTemplate(
        resource.PapercutSyncClientCredentialsConfigurationProfileTemplate.pipe(Redacted.value)
          .name,
      ),
    ),
  );

  const invoicesProcessorClientCredentialsProfileIdEffect = Actor.use(Struct.get("tenantId")).pipe(
    Effect.map(
      tenantTemplate(
        resource.InvoicesProcessorClientCredentialsConfigurationProfileTemplate.pipe(Redacted.value)
          .name,
      ),
    ),
  );

  const getApiClientCredentials = apiClientCredentialsProfileIdEffect.pipe(
    Effect.andThen((profileId) =>
      agent.getConfiguration(profileId, OauthContract.ClientCredentials),
    ),
    Effect.withSpan("Config.getApiClientCredentials"),
  );

  const setApiClientCredentials = Effect.fn("Config.setApiClientCredentials")(
    (value: OauthContract.ClientCredentials, deploymentStrategy: DeploymentStrategy = "slow") =>
      apiClientCredentialsProfileIdEffect.pipe(
        Effect.andThen((profileId) =>
          appconfig.publish({
            profileId,
            Codec: OauthContract.ClientCredentials,
            deploymentStrategyId: matchDeploymentStrategyId(deploymentStrategy),
            value,
          }),
        ),
      ),
  );

  const getPapercutApiAuthToken = papercutApiAuthTokenProfileIdEffect.pipe(
    Effect.andThen((profileId) => agent.getConfiguration(profileId, PapercutContract.ApiAuthToken)),
    Effect.withSpan("Config.getPapercutApiAuthToken"),
  );

  const setPapercutApiAuthToken = Effect.fn("Config.setPapercutApiAuthToken")(
    (value: PapercutContract.ApiAuthToken) =>
      apiClientCredentialsProfileIdEffect.pipe(
        Effect.andThen((profileId) =>
          appconfig.publish({
            profileId,
            Codec: PapercutContract.ApiAuthToken,
            deploymentStrategyId: resource.AppconfigAllAtOnceDeploymentStrategy.pipe(Redacted.value)
              .id,
            value,
          }),
        ),
      ),
  );

  const getPapercutSyncClientCredentials = papercutSyncClientCredentialsProfileIdEffect.pipe(
    Effect.andThen((profileId) =>
      agent.getConfiguration(profileId, OauthContract.ClientCredentials),
    ),
    Effect.withSpan("Config.getPapercutSyncClientCredentials"),
  );

  const setPapercutSyncClientCredentials = Effect.fn("Config.setPapercutSyncClientCredentials")(
    (value: OauthContract.ClientCredentials, deploymentStrategy: DeploymentStrategy = "slow") =>
      papercutSyncClientCredentialsProfileIdEffect.pipe(
        Effect.andThen((profileId) =>
          appconfig.publish({
            profileId,
            Codec: OauthContract.ClientCredentials,
            deploymentStrategyId: matchDeploymentStrategyId(deploymentStrategy),
            value,
          }),
        ),
      ),
  );

  const getInvoicesProcessorClientCredentials =
    invoicesProcessorClientCredentialsProfileIdEffect.pipe(
      Effect.andThen((profileId) =>
        agent.getConfiguration(profileId, OauthContract.ClientCredentials),
      ),
      Effect.withSpan("Config.getInvoicesProcessorClientCredentials"),
    );

  const setInvoicesProcessorClientCredentials = Effect.fn(
    "Config.setInvoicesProcessorClientCredentials",
  )((value: OauthContract.ClientCredentials, deploymentStrategy: DeploymentStrategy = "slow") =>
    invoicesProcessorClientCredentialsProfileIdEffect.pipe(
      Effect.andThen((profileId) =>
        appconfig.publish({
          profileId,
          Codec: OauthContract.ClientCredentials,
          deploymentStrategyId: matchDeploymentStrategyId(deploymentStrategy),
          value,
        }),
      ),
    ),
  );

  return {
    getApiClientCredentials,
    setApiClientCredentials,
    getPapercutApiAuthToken,
    setPapercutApiAuthToken,
    getPapercutSyncClientCredentials,
    setPapercutSyncClientCredentials,
    getInvoicesProcessorClientCredentials,
    setInvoicesProcessorClientCredentials,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(Config));
