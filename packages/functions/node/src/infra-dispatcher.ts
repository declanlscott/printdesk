import { useTransaction } from "@printworks/core/drizzle/context";
import {
  tenantMetadataTable,
  tenantsTable,
} from "@printworks/core/tenants/sql";
import { Sqs, withAws } from "@printworks/core/utils/aws";
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
