import { publish } from "@printworks/core/realtime/publisher";
import { tenantInfraProgramInputSchema } from "@printworks/core/tenants/shared";
import {
  Credentials,
  SignatureV4,
  Ssm,
  withAws,
} from "@printworks/core/utils/aws";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { version as awsPluginVersion } from "@pulumi/aws/package.json";
import { version as cloudflarePluginVersion } from "@pulumi/cloudflare/package.json";
import * as pulumi from "@pulumi/pulumi";
import * as v from "valibot";

import { getProgram } from "./lib/program";
import { useResource, withResource } from "./lib/resource";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

export const handler: SQSHandler = async (event) =>
  withResource(() => {
    const { AppData, AppsyncEventApi, Aws } = useResource();

    return withAws(
      {
        sigv4: {
          signers: {
            appsync: SignatureV4.buildSigner({
              region: Aws.region,
              service: "appsync",
              credentials: Credentials.fromRoleChain([
                {
                  RoleArn: Aws.roles.realtimePublisher.arn,
                  RoleSessionName: "TenantInfraRealtimePublisher",
                },
              ]),
            }),
          },
        },
        ssm: { client: new Ssm.Client() },
      },
      async () => {
        const batchItemFailures: Array<SQSBatchItemFailure> = [];

        const cloudflareApiToken = await Ssm.getParameter({
          Name: `/${AppData.name}/${AppData.stage}/cloudflare/api-token`,
          WithDecryption: true,
        });

        for (const record of event.Records) {
          const channel = `/events/${record.messageId}` as const;

          try {
            await processRecord(record, cloudflareApiToken);

            await publish(AppsyncEventApi.dns.http, channel, [
              JSON.stringify({ type: "infra", success: true }),
            ]);
          } catch (e) {
            console.error("Failed to process record: ", record, e);

            batchItemFailures.push({ itemIdentifier: record.messageId });

            await publish(AppsyncEventApi.dns.http, channel, [
              JSON.stringify({
                type: "infra",
                success: false,
                retrying:
                  parseInt(record.attributes.ApproximateReceiveCount) < 3,
                error:
                  e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
              }),
            ]);
          }
        }

        return { batchItemFailures };
      },
    );
  });

async function processRecord(record: SQSRecord, cloudflareApiToken: string) {
  const { AppData, Aws, PulumiBucket } = useResource();

  console.log("Parsing record body ...");
  const { tenantId, ...programInput } = v.parse(
    v.object({
      tenantId: nanoIdSchema,
      ...tenantInfraProgramInputSchema.entries,
    }),
    JSON.parse(record.body),
  );
  console.log("Successfully parsed record body");

  console.log("Initializing stack ...");
  const projectName = `${AppData.name}-${AppData.stage}-tenants`;
  const stackName = `${AppData.name}-${AppData.stage}-tenant-${tenantId}`;
  const stack = await LocalWorkspace.createOrSelectStack(
    {
      projectName,
      stackName,
      program: getProgram(tenantId, programInput),
    },
    {
      projectSettings: {
        name: projectName,
        runtime: "nodejs",
        backend: {
          url: `s3://${PulumiBucket.name}/${projectName}`,
        },
      },
      pulumiHome: "/tmp/pulumi_home",
    },
  );
  console.log("Successfully initialized stack");

  console.log("Installing plugins ...");
  await Promise.all([
    stack.workspace.installPlugin("aws", `v${awsPluginVersion}`),
    stack.workspace.installPlugin("cloudflare", `v${cloudflarePluginVersion}`),
  ]);
  console.log("Successfully installed plugins");

  console.log("Setting stack configuration ...");
  await stack.setAllConfig({
    "aws:region": { value: Aws.region },
    "aws:assumeRole": { value: Aws.organization.managementRole.arn },
    "cloudflare:apiToken": {
      value: cloudflareApiToken,
      secret: true,
    },
  });
  console.log("Successfully set stack configuration");

  console.log("Updating stack ...");
  const result = await stack.up({
    onEvent: console.log,
    onOutput: console.log,
  });
  console.log("Update summary: ", result.summary.resourceChanges);

  if (result.summary.result === "failed") {
    const error = new Error(result.summary.message);

    console.error("Failed to update stack: ", error.message);

    throw error;
  }
}
