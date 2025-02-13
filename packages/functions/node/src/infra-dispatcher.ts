import { useTransaction } from "@printworks/core/drizzle/context";
import {
  tenantMetadataTable,
  tenantsTable,
} from "@printworks/core/tenants/sql";
import { Sqs, withAws } from "@printworks/core/utils/aws";
import { eq } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";

import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async () =>
  withAws({ sqs: { client: new Sqs.Client() } }, async () => {
    const tenants = await useTransaction((tx) =>
      tx
        .select({
          id: tenantsTable.id,
          infraProgramInput: tenantMetadataTable.infraProgramInput,
        })
        .from(tenantsTable)
        .innerJoin(
          tenantMetadataTable,
          eq(tenantMetadataTable.tenantId, tenantsTable.id),
        ),
    );

    const failedEntries: NonNullable<
      Awaited<ReturnType<typeof Sqs.sendMessageBatch>>["Failed"]
    > = [];

    for (const chunk of R.chunk(tenants, 10)) {
      const { Failed } = await Sqs.sendMessageBatch({
        QueueUrl: Resource.InfraQueue.url,
        Entries: chunk.map(({ id: tenantId, infraProgramInput }, index) => ({
          Id: index.toString(),
          MessageBody: JSON.stringify({ tenantId, ...infraProgramInput }),
        })),
      });

      if (Failed && Failed.length > 0) {
        console.error("Failed to send messages to SQS", Failed);
        failedEntries.push(...Failed);
      }
    }

    if (failedEntries.length > 0)
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to send messages to SQS",
          failedEntries,
        }),
      };

    return { statusCode: 204 };
  });
