import { nanoIdSchema } from "@printdesk/core/utils/shared";
import * as v from "valibot";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

// TODO: Finish implementing invoices processor

export const handler: SQSHandler = async (event) => {
  const batchItemFailures: Array<SQSBatchItemFailure> = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (e) {
      console.error("Failed to process record:", record, e);

      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function processRecord(record: SQSRecord) {
  const { invoiceId, tenantId } = v.parse(
    v.object({ invoiceId: v.string(), tenantId: nanoIdSchema }),
    JSON.parse(record.body),
  );

  console.log({ invoiceId, tenantId });
}
