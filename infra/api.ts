import { assetsPrivateKey, assetsPublicKey, assetsRouter } from "./assets";
import { identityProviders, invokeIssuerFunctionUrl, issuer } from "./auth";
import { appconfigAgent, appconfigAgentDevContainer, appconfigRoleTemplate } from "./config";
import { dsql, dynamo } from "./db";
import { hostnames } from "./dns";
import * as lib from "./lib";
import {
  invoicesProcessorQueueSenderRoleTemplate,
  papercutApiAuthTokenConfigurationProfileTemplate,
  papercutApiAuthTokenDeploymentStrategy,
} from "./papercut";
import {
  realtimeApi,
  realtimeChannelNamespacePublisherRoleTemplate,
  realtimeChannelNamespaceSubscriberRoleTemplate,
} from "./realtime";
import { aws_, cloudflare_, isProdStage } from "./utils";

import { VisibleError } from "~/sst/error";

export const apiClientCredentialsConfigurationProfileTemplate =
  new lib.templates.aws.appconfig.ConfigurationProfile(
    "ApiClientCredentialsConfigurationProfileTemplate",
    { identifier: "ApiClientCredentials" },
  );

export const apiClientCredentialsDeploymentStrategy = new aws.appconfig.DeploymentStrategy(
  "ApiClientCredentialsDeploymentStrategy",
  {
    growthType: "LINEAR",
    deploymentDurationInMinutes: 30,
    growthFactor: 20,
    finalBakeTimeInMinutes: 30,
    replicateTo: "NONE",
  },
);

export const api = new lib.aws.lambda.Function(
  "Api",
  {
    handler: "packages/typescript/functions/api/src/index.handler",
    url: { authorization: "iam" },
    link: [
      apiClientCredentialsConfigurationProfileTemplate,
      apiClientCredentialsDeploymentStrategy,
      appconfigAgent,
      appconfigRoleTemplate,
      assetsPublicKey,
      assetsPrivateKey,
      assetsRouter,
      aws_,
      cloudflare_,
      dsql,
      dynamo,
      hostnames,
      papercutApiAuthTokenConfigurationProfileTemplate,
      papercutApiAuthTokenDeploymentStrategy,
      identityProviders,
      invoicesProcessorQueueSenderRoleTemplate,
      issuer,
      realtimeApi,
      realtimeChannelNamespacePublisherRoleTemplate,
      realtimeChannelNamespaceSubscriberRoleTemplate,
    ],
    permissions: [invokeIssuerFunctionUrl],
    environment: {
      AWS_APPCONFIG_EXTENSION_HTTP_PORT: appconfigAgent.properties.port.toString(),
      AWS_APPCONFIG_EXTENSION_LOG_LEVEL: isProdStage ? "info" : "error",
    },
    transform: {
      function: (args) => {
        if (!$dev)
          args.layers = [
            $resolve({
              architectures: $output(args.architectures),
              region: $output(args.region),
            }).apply(({ architectures = ["x86_64"], region = aws_.properties.region }) => {
              // https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions-versions.html
              // version 2.0.17054.0
              const appconfigLayerArn =
                architectures[0] === "arm64"
                  ? [
                      "arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension-Arm64:254",
                      "arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension-Arm64:229",
                      "arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension-Arm64:272",
                      "arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension-Arm64:275",
                      "arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension-Arm64:182",
                      "arn:aws:lambda:ca-west-1:436199621743:layer:AWS-AppConfig-Extension-Arm64:162",
                      "arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension-Arm64:238",
                      "arn:aws:lambda:eu-central-2:758369105281:layer:AWS-AppConfig-Extension-Arm64:178",
                      "arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension-Arm64:241",
                      "arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension-Arm64:194",
                      "arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension-Arm64:192",
                      "arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension-Arm64:226",
                      "arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension-Arm64:177",
                      "arn:aws:lambda:eu-south-2:586093569114:layer:AWS-AppConfig-Extension-Arm64:175",
                      "arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension-Arm64:182",
                      "arn:aws:lambda:ap-east-2:730335625313:layer:AWS-AppConfig-Extension-Arm64:121",
                      "arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension-Arm64:225",
                      "arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension-Arm64:181",
                      "arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension-Arm64:187",
                      "arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension-Arm64:210",
                      "arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension-Arm64:256",
                      "arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension-Arm64:193",
                      "arn:aws:lambda:ap-southeast-4:307021474294:layer:AWS-AppConfig-Extension-Arm64:173",
                      "arn:aws:lambda:ap-southeast-5:631746059939:layer:AWS-AppConfig-Extension-Arm64:136",
                      "arn:aws:lambda:ap-southeast-6:381491832265:layer:AWS-AppConfig-Extension-Arm64:87",
                      "arn:aws:lambda:ap-southeast-7:851725616657:layer:AWS-AppConfig-Extension-Arm64:133",
                      "arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension-Arm64:232",
                      "arn:aws:lambda:ap-south-2:489524808438:layer:AWS-AppConfig-Extension-Arm64:175",
                      "arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension-Arm64:215",
                      "arn:aws:lambda:mx-central-1:891376990304:layer:AWS-AppConfig-Extension-Arm64:141",
                      "arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension-Arm64:188",
                      "arn:aws:lambda:me-central-1:662846165436:layer:AWS-AppConfig-Extension-Arm64:168",
                      "arn:aws:lambda:me-south-1:559955524753:layer:AWS-AppConfig-Extension-Arm64:182",
                      "arn:aws:lambda:il-central-1:895787185223:layer:AWS-AppConfig-Extension-Arm64:171",
                    ].find((arn) => arn.includes(region))
                  : [
                      "arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:321",
                      "arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension:277",
                      "arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension:395",
                      "arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension:373",
                      "arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension:262",
                      "arn:aws:lambda:ca-west-1:436199621743:layer:AWS-AppConfig-Extension:172",
                      "arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension:295",
                      "arn:aws:lambda:eu-central-2:758369105281:layer:AWS-AppConfig-Extension:220",
                      "arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension:303",
                      "arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension:242",
                      "arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension:273",
                      "arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension:367",
                      "arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension:249",
                      "arn:aws:lambda:eu-south-2:586093569114:layer:AWS-AppConfig-Extension:214",
                      "arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension:254",
                      "arn:aws:lambda:ap-east-2:730335625313:layer:AWS-AppConfig-Extension:147",
                      "arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension:272",
                      "arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension:273",
                      "arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension:272",
                      "arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension:258",
                      "arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension:313",
                      "arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension:256",
                      "arn:aws:lambda:ap-southeast-4:307021474294:layer:AWS-AppConfig-Extension:188",
                      "arn:aws:lambda:ap-southeast-5:631746059939:layer:AWS-AppConfig-Extension:161",
                      "arn:aws:lambda:ap-southeast-6:381491832265:layer:AWS-AppConfig-Extension:97",
                      "arn:aws:lambda:ap-southeast-7:851725616657:layer:AWS-AppConfig-Extension:134",
                      "arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension:290",
                      "arn:aws:lambda:ap-south-2:489524808438:layer:AWS-AppConfig-Extension:217",
                      "arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension:327",
                      "arn:aws:lambda:mx-central-1:891376990304:layer:AWS-AppConfig-Extension:142",
                      "arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension:260",
                      "arn:aws:lambda:il-central-1:895787185223:layer:AWS-AppConfig-Extension:188",
                      "arn:aws:lambda:me-central-1:662846165436:layer:AWS-AppConfig-Extension:212",
                      "arn:aws:lambda:me-south-1:559955524753:layer:AWS-AppConfig-Extension:254",
                    ].find((arn) => arn.includes(region));

              if (!appconfigLayerArn)
                throw new VisibleError(
                  `Could not find appconfig layer corresponding to the function's region "${region}".`,
                );

              return appconfigLayerArn;
            }),
          ];
      },
    },
  },
  { dependsOn: appconfigAgentDevContainer ? [appconfigAgentDevContainer] : [] },
);

export const invokeApiFunctionUrl = sst.aws.permission({
  actions: ["lambda:InvokeFunctionUrl"],
  resources: [api.arn],
});
