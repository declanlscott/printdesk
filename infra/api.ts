import { VisibleError } from "~/sst/error";

import { assetsPrivateKey, assetsPublicKey, assetsRouter } from "./assets";
import { identityProviders, invokeIssuerFunctionUrl, issuer } from "./auth";
import { appconfigAgent, appconfigAgentDevContainer } from "./config";
import { dsql, dynamo } from "./db";
import { hostnames } from "./dns";
import * as lib from "./lib";
import {
  invoicesProcessorQueueSenderRoleTemplate,
  papercutApiAuthTokenConfigurationProfileTemplate,
  papercutApiGatewayOauthClientConfigurationProfileTemplate,
} from "./papercut";
import {
  realtimeApi,
  realtimePublicChannelNamespacePublisherRole,
  realtimePublicChannelNamespaceSubscriberRole,
  realtimeTenantChannelNamespacePublisherRoleTemplate,
  realtimeTenantChannelNamespaceSubscriberRoleTemplate,
} from "./realtime";
import { aws_, cloudflare_, isProdStage } from "./utils";

export const api = new lib.aws.lambda.Function(
  "Api",
  {
    handler: "packages/typescript/functions/api/src/index.handler",
    url: { authorization: "iam" },
    link: [
      appconfigAgent,
      assetsPublicKey,
      assetsPrivateKey,
      assetsRouter,
      aws_,
      cloudflare_,
      dsql,
      dynamo,
      hostnames,
      papercutApiAuthTokenConfigurationProfileTemplate,
      papercutApiGatewayOauthClientConfigurationProfileTemplate,
      identityProviders,
      invoicesProcessorQueueSenderRoleTemplate,
      issuer,
      realtimeApi,
      realtimePublicChannelNamespacePublisherRole,
      realtimePublicChannelNamespaceSubscriberRole,
      realtimeTenantChannelNamespacePublisherRoleTemplate,
      realtimeTenantChannelNamespaceSubscriberRoleTemplate,
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
              // version 2.0.14126.0
              const appconfigLayerArn =
                architectures[0] === "arm64"
                  ? [
                      "arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension-Arm64:250",
                      "arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension-Arm64:225",
                      "arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension-Arm64:260",
                      "arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension-Arm64:271",
                      "arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension-Arm64:178",
                      "arn:aws:lambda:ca-west-1:436199621743:layer:AWS-AppConfig-Extension-Arm64:158",
                      "arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension-Arm64:234",
                      "arn:aws:lambda:eu-central-2:758369105281:layer:AWS-AppConfig-Extension-Arm64:174",
                      "arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension-Arm64:237",
                      "arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension-Arm64:190",
                      "arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension-Arm64:188",
                      "arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension-Arm64:222",
                      "arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension-Arm64:173",
                      "arn:aws:lambda:eu-south-2:586093569114:layer:AWS-AppConfig-Extension-Arm64:171",
                      "arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension-Arm64:177",
                      "arn:aws:lambda:ap-east-2:730335625313:layer:AWS-AppConfig-Extension-Arm64:113",
                      "arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension-Arm64:228",
                      "arn:aws:lambda:ap-south-2:489524808438:layer:AWS-AppConfig-Extension-Arm64:171",
                      "arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension-Arm64:221",
                      "arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension-Arm64:177",
                      "arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension-Arm64:183",
                      "arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension-Arm64:206",
                      "arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension-Arm64:252",
                      "arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension-Arm64:189",
                      "arn:aws:lambda:ap-southeast-4:307021474294:layer:AWS-AppConfig-Extension-Arm64:169",
                      "arn:aws:lambda:ap-southeast-5:631746059939:layer:AWS-AppConfig-Extension-Arm64:132",
                      "arn:aws:lambda:ap-southeast-6:381491832265:layer:AWS-AppConfig-Extension-Arm64:77",
                      "arn:aws:lambda:ap-southeast-7:851725616657:layer:AWS-AppConfig-Extension-Arm64:129",
                      "arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension-Arm64:184",
                      "arn:aws:lambda:il-central-1:895787185223:layer:AWS-AppConfig-Extension-Arm64:167",
                      "arn:aws:lambda:mx-central-1:891376990304:layer:AWS-AppConfig-Extension-Arm64:137",
                      "arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension-Arm64:211",
                    ].find((arn) => arn.includes(region))
                  : [
                      "arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:317",
                      "arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension:273",
                      "arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension:383",
                      "arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension:369",
                      "arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension:258",
                      "arn:aws:lambda:ca-west-1:436199621743:layer:AWS-AppConfig-Extension:168",
                      "arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension:291",
                      "arn:aws:lambda:eu-central-2:758369105281:layer:AWS-AppConfig-Extension:216",
                      "arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension:299",
                      "arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension:238",
                      "arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension:269",
                      "arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension:363",
                      "arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension:245",
                      "arn:aws:lambda:eu-south-2:586093569114:layer:AWS-AppConfig-Extension:210",
                      "arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension:249",
                      "arn:aws:lambda:ap-east-2:730335625313:layer:AWS-AppConfig-Extension:139",
                      "arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension:286",
                      "arn:aws:lambda:ap-south-2:489524808438:layer:AWS-AppConfig-Extension:213",
                      "arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension:268",
                      "arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension:269",
                      "arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension:268",
                      "arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension:254",
                      "arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension:309",
                      "arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension:252",
                      "arn:aws:lambda:ap-southeast-4:307021474294:layer:AWS-AppConfig-Extension:184",
                      "arn:aws:lambda:ap-southeast-5:631746059939:layer:AWS-AppConfig-Extension:157",
                      "arn:aws:lambda:ap-southeast-6:381491832265:layer:AWS-AppConfig-Extension:87",
                      "arn:aws:lambda:ap-southeast-7:851725616657:layer:AWS-AppConfig-Extension:130",
                      "arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension:256",
                      "arn:aws:lambda:il-central-1:895787185223:layer:AWS-AppConfig-Extension:184",
                      "arn:aws:lambda:mx-central-1:891376990304:layer:AWS-AppConfig-Extension:138",
                      "arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension:323",
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
