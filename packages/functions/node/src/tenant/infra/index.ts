import { tenantInfraProgramInputSchema } from "@printworks/core/tenants/shared";
import { Ssm, Sts, withAws } from "@printworks/core/utils/aws";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { version as awsPluginVersion } from "@pulumi/aws/package.json";
import { version as cloudflarePluginVersion } from "@pulumi/cloudflare/package.json";
import * as pulumi from "@pulumi/pulumi";
import * as v from "valibot";

import { getProgram } from "./lib/program";
import { useResource, withResource } from "./lib/resource";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

export const handler: SQSHandler = async (event) =>
  withResource(() =>
    withAws(
      {
        ssm: { client: new Ssm.Client() },
        sts: { client: new Sts.Client() },
      },
      async () => {
        const batchItemFailures: Array<SQSBatchItemFailure> = [];

        for (const record of event.Records) {
          try {
            await processRecord(record);
          } catch (e) {
            console.error("Failed to process record: ", record, e);

            batchItemFailures.push({ itemIdentifier: record.messageId });
          }
        }

        return { batchItemFailures };
      },
    ),
  );

async function processRecord(record: SQSRecord) {
  const { AppData, Aws, PulumiBucket } = useResource();

  console.log("Parsing record body ...");
  const { tenantId, ...programInput } = v.parse(
    v.object({
      tenantId: nanoIdSchema,
      ...tenantInfraProgramInputSchema.entries,
    }),
    record.body,
  );
  console.log("Successfully parsed record body");

  console.log("Initializing stack ...");
  const projectName = `${AppData.name}-${AppData.stage}-tenants`;
  const stack = await pulumi.automation.LocalWorkspace.createOrSelectStack(
    {
      projectName,
      stackName: `tenant-${tenantId}`,
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

  console.log("Retrieving Cloudflare API token ...");
  const cloudflareApiToken = await Ssm.getParameter({
    Name: `/${AppData.name}/${AppData.stage}/cloudflare/api-token`,
    WithDecryption: true,
  });
  console.log("Successfully retrieved Cloudflare API token");

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
