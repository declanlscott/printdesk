import * as R from "remeda";

import * as lib from "./lib";
import { aws_ } from "./utils";

import type { Transform } from "~/sst/component";
import { VisibleError } from "~/sst/error";

const applicationName = new lib.PhysicalName("AppconfigApplication", {
  max: 64,
});
export const appconfigApplication = new aws.appconfig.Application(applicationName.logical, {
  name: applicationName.result,
});

export const appconfigEnvironment = new aws.appconfig.Environment("AppconfigEnvironment", {
  applicationId: appconfigApplication.id,
  name: $app.stage,
});

export const appconfigAgent = new sst.Linkable("AppconfigAgent", {
  properties: { port: $output(2772) },
  include: [
    sst.aws.permission({
      actions: ["appconfig:StartConfigurationSession", "appconfig:GetLatestConfiguration"],
      resources: ["*"],
    }),
  ],
});

export let appconfigAgentDevContainer: docker.Container | undefined;
if ($dev) {
  const appconfigAgentDevImage = new docker.RemoteImage("AppconfigAgentDevImage", {
    name: "public.ecr.aws/aws-appconfig/aws-appconfig-agent:latest",
  });

  const appconfigAgentDevRole = new lib.aws.iam.ExternalRole("AppconfigAgentDevRole", {
    transform: {
      role: {
        inlinePolicies: [
          {
            policy: aws.iam.getPolicyDocumentOutput({
              statements: appconfigAgent
                .getSSTLink()
                .include?.map(({ effect = "allow", ...statement }) => ({
                  effect: effect.charAt(0).toUpperCase() + effect.slice(1),
                  ...R.omit(statement, ["type"]),
                })),
            }).json,
          },
        ],
      },
    },
  });

  appconfigAgentDevContainer = new docker.Container("AppconfigAgentDevContainer", {
    image: appconfigAgentDevImage.imageId,
    ports: [{ internal: appconfigAgent.properties.port, external: appconfigAgent.properties.port }],
    envs: [
      // oxlint-disable typescript/no-non-null-assertion
      `AWS_REGION=${$app.providers!.aws.region}`,
      $interpolate`ROLE_ARN=${appconfigAgentDevRole.arn}`,
      $interpolate`ROLE_EXTERNAL_ID=${appconfigAgentDevRole.externalId}`,
      $interpolate`HTTP_PORT=${appconfigAgent.properties.port}`,
      "LOG_LEVEL=error",
    ],
    healthcheck: {
      tests: [
        "CMD-SHELL",
        $interpolate`curl -fSs http://localhost:${appconfigAgent.properties.port}/ping || exit 1`,
      ],
      interval: "1s",
      timeout: "5s",
      retries: 10,
    },
    wait: true,
  });
}

export const appconfigRoleTemplate = new lib.templates.aws.iam.Role("AppconfigRoleTemplate", {
  identifier: "AppconfigRole",
});

export const appconfigAllAtOnceDeploymentStrategy = new aws.appconfig.DeploymentStrategy(
  "AppconfigAllAtOnceDeploymentStrategy",
  {
    growthType: "LINEAR",
    deploymentDurationInMinutes: 0,
    growthFactor: 100,
    finalBakeTimeInMinutes: 10,
    replicateTo: "NONE",
  },
);

export const appconfigLinear20PercentEvery6MinutesDeploymentStrategy =
  new aws.appconfig.DeploymentStrategy("AppconfigLinear20PercentEvery6MinutesDeploymentStrategy", {
    growthType: "LINEAR",
    deploymentDurationInMinutes: 30,
    growthFactor: 20,
    finalBakeTimeInMinutes: 30,
    replicateTo: "NONE",
  });

export const appconfigAgentExtensionTransform: Transform<aws.lambda.FunctionArgs> = (args) => {
  if (!$dev)
    args.layers = [
      $resolve({ architectures: $output(args.architectures), region: $output(args.region) }).apply(
        ({ architectures = ["x86_64"], region = aws_.properties.region }) => {
          // https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions-versions.html
          // version 2.0.18836
          const appconfigLayerArn =
            architectures[0] === "arm64"
              ? [
                  "arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:328",
                  "arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension:279",
                  "arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension:403",
                  "arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension:375",
                  "arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension:264",
                  "arn:aws:lambda:ca-west-1:436199621743:layer:AWS-AppConfig-Extension:174",
                  "arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension:297",
                  "arn:aws:lambda:eu-central-2:758369105281:layer:AWS-AppConfig-Extension:222",
                  "arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension:305",
                  "arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension:248",
                  "arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension:275",
                  "arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension:369",
                  "arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension:251",
                  "arn:aws:lambda:eu-south-2:586093569114:layer:AWS-AppConfig-Extension:216",
                  "arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension:258",
                  "arn:aws:lambda:ap-east-2:730335625313:layer:AWS-AppConfig-Extension:149",
                  "arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension:274",
                  "arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension:278",
                  "arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension:276",
                  "arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension:260",
                  "arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension:315",
                  "arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension:258",
                  "arn:aws:lambda:ap-southeast-4:307021474294:layer:AWS-AppConfig-Extension:194",
                  "arn:aws:lambda:ap-southeast-5:631746059939:layer:AWS-AppConfig-Extension:163",
                  "arn:aws:lambda:ap-southeast-6:381491832265:layer:AWS-AppConfig-Extension:99",
                  "arn:aws:lambda:ap-southeast-7:851725616657:layer:AWS-AppConfig-Extension:136",
                  "arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension:292",
                  "arn:aws:lambda:ap-south-2:489524808438:layer:AWS-AppConfig-Extension:219",
                  "arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension:334",
                  "arn:aws:lambda:mx-central-1:891376990304:layer:AWS-AppConfig-Extension:144",
                  "arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension:262",
                  "arn:aws:lambda:il-central-1:895787185223:layer:AWS-AppConfig-Extension:190",
                  "arn:aws:lambda:me-central-1:662846165436:layer:AWS-AppConfig-Extension:212",
                  "arn:aws:lambda:me-south-1:559955524753:layer:AWS-AppConfig-Extension:254",
                ].find((arn) => arn.includes(region))
              : [
                  "arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension-Arm64:261",
                  "arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension-Arm64:231",
                  "arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension-Arm64:280",
                  "arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension-Arm64:277",
                  "arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension-Arm64:184",
                  "arn:aws:lambda:ca-west-1:436199621743:layer:AWS-AppConfig-Extension-Arm64:164",
                  "arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension-Arm64:240",
                  "arn:aws:lambda:eu-central-2:758369105281:layer:AWS-AppConfig-Extension-Arm64:180",
                  "arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension-Arm64:243",
                  "arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension-Arm64:200",
                  "arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension-Arm64:194",
                  "arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension-Arm64:228",
                  "arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension-Arm64:179",
                  "arn:aws:lambda:eu-south-2:586093569114:layer:AWS-AppConfig-Extension-Arm64:177",
                  "arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension-Arm64:186",
                  "arn:aws:lambda:ap-east-2:730335625313:layer:AWS-AppConfig-Extension-Arm64:123",
                  "arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension-Arm64:227",
                  "arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension-Arm64:186",
                  "arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension-Arm64:191",
                  "arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension-Arm64:212",
                  "arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension-Arm64:258",
                  "arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension-Arm64:195",
                  "arn:aws:lambda:ap-southeast-4:307021474294:layer:AWS-AppConfig-Extension-Arm64:179",
                  "arn:aws:lambda:ap-southeast-5:631746059939:layer:AWS-AppConfig-Extension-Arm64:138",
                  "arn:aws:lambda:ap-southeast-6:381491832265:layer:AWS-AppConfig-Extension-Arm64:89",
                  "arn:aws:lambda:ap-southeast-7:851725616657:layer:AWS-AppConfig-Extension-Arm64:135",
                  "arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension-Arm64:234",
                  "arn:aws:lambda:ap-south-2:489524808438:layer:AWS-AppConfig-Extension-Arm64:177",
                  "arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension-Arm64:222",
                  "arn:aws:lambda:mx-central-1:891376990304:layer:AWS-AppConfig-Extension-Arm64:143",
                  "arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension-Arm64:190",
                  "arn:aws:lambda:me-central-1:662846165436:layer:AWS-AppConfig-Extension-Arm64:168",
                  "arn:aws:lambda:me-south-1:559955524753:layer:AWS-AppConfig-Extension-Arm64:182",
                  "arn:aws:lambda:il-central-1:895787185223:layer:AWS-AppConfig-Extension-Arm64:173",
                ].find((arn) => arn.includes(region));

          if (!appconfigLayerArn)
            throw new VisibleError(
              `Could not find appconfig layer corresponding to the function's region "${region}".`,
            );

          return appconfigLayerArn;
        },
      ),
    ];
};
