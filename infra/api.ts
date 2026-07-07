import { assetsPrivateKey, assetsPublicKey, assetsRouter } from "./assets";
import { identityProviders, invokeIssuerFunctionUrl, issuer } from "./auth";
import {
  appconfigAgent,
  appconfigAgentDevContainer,
  appconfigAllAtOnceDeploymentStrategy,
  appconfigApplication,
  appconfigEnvironment,
  appconfigAgentExtensionTransform,
  appconfigLinear20PercentEvery6MinutesDeploymentStrategy,
  appconfigRoleTemplate,
} from "./config";
import { dsql, dynamo } from "./db";
import { hostnames } from "./dns";
import * as lib from "./lib";
import {
  invoicesProcessorQueueSenderRoleTemplate,
  papercutMfApiAuthTokenConfigurationProfileTemplate,
} from "./papercut";
import {
  appsyncApi,
  appsyncChannelNamespacePublisherRoleTemplate,
  appsyncChannelNamespaceSubscriberRoleTemplate,
} from "./realtime";
import { aws_, cloudflare_, isProdStage } from "./utils";

export const apiClientCredentialsConfigurationProfileTemplate =
  new lib.templates.aws.appconfig.ConfigurationProfile(
    "ApiClientCredentialsConfigurationProfileTemplate",
    { identifier: "ApiClientCredentials" },
  );

export const api = new lib.aws.lambda.Function(
  "Api",
  {
    handler: "packages/typescript/functions/api/src/index.default",
    url: { authorization: "iam" },
    link: [
      apiClientCredentialsConfigurationProfileTemplate,
      appconfigAgent,
      appconfigAllAtOnceDeploymentStrategy,
      appconfigApplication,
      appconfigEnvironment,
      appconfigLinear20PercentEvery6MinutesDeploymentStrategy,
      appconfigRoleTemplate,
      appsyncApi,
      appsyncChannelNamespacePublisherRoleTemplate,
      appsyncChannelNamespaceSubscriberRoleTemplate,
      assetsPublicKey,
      assetsPrivateKey,
      assetsRouter,
      aws_,
      cloudflare_,
      dsql,
      dynamo,
      hostnames,
      papercutMfApiAuthTokenConfigurationProfileTemplate,
      identityProviders,
      invoicesProcessorQueueSenderRoleTemplate,
      issuer,
    ],
    permissions: [invokeIssuerFunctionUrl],
    environment: {
      AWS_APPCONFIG_EXTENSION_HTTP_PORT: appconfigAgent.properties.port.toString(),
      AWS_APPCONFIG_EXTENSION_LOG_LEVEL: isProdStage ? "info" : "error",
    },
    transform: { function: appconfigAgentExtensionTransform },
  },
  { dependsOn: appconfigAgentDevContainer ? [appconfigAgentDevContainer] : [] },
);

export const invokeApiFunctionUrl = sst.aws.permission({
  actions: ["lambda:InvokeFunctionUrl"],
  resources: [api.arn],
});
