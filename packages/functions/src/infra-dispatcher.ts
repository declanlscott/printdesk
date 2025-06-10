import { Sqs } from "@printdesk/core/aws";
import { withAws } from "@printdesk/core/aws/context";
import { useTransaction } from "@printdesk/core/database/context";
import { tenantMetadataTable, tenantsTable } from "@printdesk/core/tenants/sql";
import { eq } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";

export const handler = async () =>
  withAws(
    () => ({ sqs: { client: new Sqs.Client() } }),
    async () => {
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
          )
          .where(eq(tenantsTable.status, "active")),
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

        if (Failed && !R.isEmpty(Failed)) {
          console.error("Failed to send messages to SQS", Failed);
          failedEntries.push(...Failed);
        }
      }

      if (!R.isEmpty(failedEntries)) return { success: false };

      return { success: true };
    },
  );
