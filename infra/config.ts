import * as lib from "./lib";

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
              statements: [
                {
                  actions: [
                    "appconfig:StartConfigurationSession",
                    "appconfig:GetLatestConfiguration",
                  ],
                  resources: ["*"],
                },
              ],
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
