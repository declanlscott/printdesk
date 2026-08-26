import { issuer } from "./auth";
import {
  appconfigAgent,
  appconfigAgentDevContainer,
  appconfigAllAtOnceDeploymentStrategy,
  appconfigApplication,
  appconfigEnvironment,
  appconfigAgentExtensionTransform,
  appconfigLinear20PercentEvery6MinutesDeploymentStrategy,
  appconfigRoleTemplate,
  apiClientCredentialsConfigurationProfileTemplate,
  invoicesProcessorClientCredentialsConfigurationProfileTemplate,
  papercutMfSyncClientCredentialsConfigurationProfileTemplate,
} from "./config";
import { dsql, dynamo } from "./db";
import { hostnames } from "./dns";
import { appsyncApi, appsyncChannelNamespacePublisherRoleTemplate } from "./realtime";
import { aws_, isProdStage } from "./utils";

export const bootstrapper = new sst.aws.Workflow(
  "Bootstrapper",
  {
    handler: "packages/typescript/functions/bootstrapper/src/index.default",
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
      aws_,
      dsql,
      dynamo,
      hostnames,
      papercutMfSyncClientCredentialsConfigurationProfileTemplate,
      invoicesProcessorClientCredentialsConfigurationProfileTemplate,
      issuer,
    ],
    environment: {
      AWS_APPCONFIG_EXTENSION_HTTP_PORT: appconfigAgent.properties.port.apply(String),
      AWS_APPCONFIG_EXTENSION_LOG_LEVEL: isProdStage ? "info" : "error",
    },
    transform: { function: { function: appconfigAgentExtensionTransform } },
  },
  { dependsOn: appconfigAgentDevContainer ? [appconfigAgentDevContainer] : [] },
);
