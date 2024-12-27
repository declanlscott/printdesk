import { db } from "@printworks/core/drizzle";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { Sqs, withAws } from "@printworks/core/utils/aws";
import * as R from "remeda";
import { Resource } from "sst";

import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async () =>
  withAws({ sqs: { client: new Sqs.Client() } }, async () => {
    const tenants = await db.select({ id: tenantsTable.id }).from(tenantsTable);

    const failedEntries: NonNullable<
      Awaited<ReturnType<typeof Sqs.sendMessageBatch>>["Failed"]
    > = [];

    for (const ids of R.chunk(R.map(tenants, R.prop("id")), 10)) {
      const { Failed } = await Sqs.sendMessageBatch({
        QueueUrl: Resource.TenantInfraQueue.url,
        Entries: ids.map((id, index) => ({
          Id: index.toString(),
          MessageBody: JSON.stringify({ tenantId: id }),
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
